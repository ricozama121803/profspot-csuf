import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import departments from "../../departments.json";

const systemPrompt = `You are ProfSpot CSUF, a conversational AI agent that helps California State University, Fullerton (CSUF) students find and evaluate professors. Your data comes from RateMyProfessors: each professor has overall stats (rating out of 5, difficulty out of 5, would-take-again percentage, number of ratings, courses, tags) plus student reviews.

Each user message is followed by "Retrieved data", which the system pulled automatically from the database for that message. Rules:
- Only recommend or describe professors that appear in the retrieved data. Never invent professors, stats, or quotes. If nothing relevant was retrieved, say so and suggest how the student could rephrase (department, course code, or what they care about).
- Recommend up to 3 professors unless the student asks for more, or asks about one specific professor. Format EACH professor exactly like this (the UI turns these labels into icons, so keep the labels and order; leave out a line only if the data is missing):
### Professor Name
- **Department:** ...
- **Overall Rating:** 4.4/5 (44 ratings)
- **Difficulty:** 3.2/5
- **Would Take Again:** 85%
- **Courses:** CPSC131, CPSC121
- **Summary:** 1-2 sentences grounded in the reviews.
- Be upfront when a professor has few ratings (under ~5) because the sample is small.
- If the retrieved data is about a different department or course than the student asked about, say that rather than presenting it as a match.
- Be friendly and concise. Use markdown.`;

const PLAN_PROMPT = `You convert a CSUF student's chat message into a search plan for a professor-review database.
Return JSON with exactly these keys:
- "searchText": a standalone search query capturing what the student wants (resolve pronouns like "he"/"that class" using the conversation; include a professor's name if they are asking about one)
- "departments": array of department names copied EXACTLY from the allowed list that clearly match the request (max 3, [] if unsure or not department-specific)
- "courses": array of course codes mentioned, like "CPSC 131" ([] if none)
- "sort": "rating" if they want the best/highest-rated, "easiest" if they want the easiest/lowest difficulty, "hardest" if they want the hardest, otherwise "relevance"
- "minRating": a number 1-5 if they state a minimum rating, else null

Allowed departments: ${JSON.stringify(departments)}`;

const normCourse = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const fmt = (n, d = 1) => (typeof n === "number" ? n.toFixed(d) : "n/a");

async function planQuery(openai, messages) {
    const fallback = { searchText: messages[messages.length - 1].content, departments: [], courses: [], sort: "relevance", minRating: null };
    try {
        const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            temperature: 0,
            messages: [{ role: "system", content: PLAN_PROMPT }, ...messages.slice(-6)],
        });
        const plan = JSON.parse(res.choices[0].message.content);
        const valid = new Set(departments);
        return {
            searchText: String(plan.searchText || fallback.searchText),
            departments: (plan.departments || []).filter((d) => valid.has(d)).slice(0, 3),
            courses: (plan.courses || []).map(normCourse).filter(Boolean).slice(0, 5),
            sort: ["rating", "easiest", "hardest"].includes(plan.sort) ? plan.sort : "relevance",
            minRating: typeof plan.minRating === "number" ? plan.minRating : null,
        };
    } catch (err) {
        console.error("planQuery failed, using raw message", err);
        return fallback;
    }
}

function filters(plan, { withScope = true } = {}) {
    const profile = { type: { $eq: "professor" }, numRatings: { $gte: plan.sort === "relevance" ? 3 : 5 } };
    const review = { type: { $eq: "review" } };
    if (withScope && plan.courses.length) {
        profile.courses = { $in: plan.courses };
        review.course = { $in: plan.courses };
    } else if (withScope && plan.departments.length) {
        profile.department = { $in: plan.departments };
        review.department = { $in: plan.departments };
    }
    if (plan.minRating) profile.avgRating = { $gte: plan.minRating };
    return { profile, review };
}

async function retrieve(index, vector, plan) {
    const query = (filter, topK) => index.query({ vector, topK, includeMetadata: true, filter });
    const scoped = plan.courses.length || plan.departments.length;
    let f = filters(plan);

    // ranked lists ("best", "easiest"...): filter profiles, sort by stats, then fetch supporting reviews
    if (plan.sort !== "relevance") {
        let { matches } = await query(f.profile, 100);
        if (!matches.length && scoped) ({ matches } = await query(filters(plan, { withScope: false }).profile, 100));
        const by = {
            rating: (a, b) => b.metadata.avgRating - a.metadata.avgRating || b.metadata.numRatings - a.metadata.numRatings,
            easiest: (a, b) => a.metadata.avgDifficulty - b.metadata.avgDifficulty || b.metadata.numRatings - a.metadata.numRatings,
            hardest: (a, b) => b.metadata.avgDifficulty - a.metadata.avgDifficulty || b.metadata.numRatings - a.metadata.numRatings,
        }[plan.sort];
        const top = matches.sort(by).slice(0, 5);
        const { matches: revs } = top.length
            ? await query({ type: { $eq: "review" }, professorId: { $in: top.map((m) => m.id) } }, 25)
            : { matches: [] };
        return { profiles: top, reviews: revs };
    }

    let [p, r] = await Promise.all([query(f.profile, 10), query(f.review, 40)]);
    if (!p.matches.length && !r.matches.length && scoped) {
        f = filters(plan, { withScope: false });
        [p, r] = await Promise.all([query(f.profile, 10), query(f.review, 40)]);
    }

    // score professors by best-matching vector, with a small bonus for several matching reviews
    const score = new Map();
    const bump = (id, s, isReview) => {
        const cur = score.get(id) || { best: 0, reviews: 0 };
        cur.best = Math.max(cur.best, s);
        if (isReview) cur.reviews += 1;
        score.set(id, cur);
    };
    p.matches.forEach((m) => bump(m.id, m.score, false));
    r.matches.forEach((m) => bump(m.metadata.professorId, m.score, true));
    const rankedIds = [...score.entries()]
        .map(([id, s]) => [id, s.best + 0.02 * Math.min(s.reviews, 5)])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

    const known = new Map(p.matches.map((m) => [m.id, m]));
    const missing = rankedIds.filter((id) => !known.has(id));
    if (missing.length) {
        const fetched = await index.fetch(missing);
        Object.values(fetched.records || {}).forEach((rec) => known.set(rec.id, rec));
    }
    return { profiles: rankedIds.map((id) => known.get(id)).filter(Boolean), reviews: r.matches };
}

function buildContext(plan, { profiles, reviews }) {
    if (!profiles.length) return "\n\nRetrieved data: no matching professors were found.";
    const revsBy = new Map();
    reviews.forEach((m) => {
        const list = revsBy.get(m.metadata.professorId) || [];
        list.push(m.metadata);
        revsBy.set(m.metadata.professorId, list);
    });
    let out = `\n\nRetrieved data (search: "${plan.searchText}"${plan.departments.length ? `, departments: ${plan.departments.join("/")}` : ""}${plan.courses.length ? `, courses: ${plan.courses.join("/")}` : ""}):`;
    profiles.forEach((pr) => {
        const m = pr.metadata;
        out += `\n\nProfessor: ${m.professor} | Department: ${m.department} | Overall: ${fmt(m.avgRating)}/5 from ${m.numRatings} ratings | Difficulty: ${fmt(m.avgDifficulty)}/5`;
        if (typeof m.wouldTakeAgain === "number") out += ` | Would take again: ${m.wouldTakeAgain}%`;
        if (m.courses?.length) out += ` | Courses: ${m.courses.slice(0, 8).join(", ")}`;
        if (m.tags?.length) out += ` | Tags: ${m.tags.join(", ")}`;
        (revsBy.get(pr.id) || []).slice(0, 3).forEach((r) => {
            out += `\n  - Review${r.course ? ` (${r.course}${r.year ? `, ${r.year}` : ""})` : ""}: ${r.stars}/5 stars. ${String(r.text).slice(0, 500)}`;
        });
    });
    return out;
}

const isOutage = (err) =>
    err?.status === 429 || err?.status === 401 || err?.code === 'insufficient_quota' || err?.code === 'credit_balance_exhausted'

export async function POST(req) {
    try {
        return await handleChat(req)
    } catch (err) {
        console.error('chat failed', err)
        // quota/billing/auth problems are on our side: tell the UI the app is down for maintenance
        return NextResponse.json({ error: isOutage(err) ? 'maintenance' : 'error' }, { status: isOutage(err) ? 503 : 500 })
    }
}

async function handleChat(req) {
    const data = await req.json()
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
    const index = pc.index(process.env.PINECONE_INDEX || 'profspot-csuf').namespace(process.env.PINECONE_NAMESPACE || 'csuf')
    const openai = new OpenAI()

    const plan = await planQuery(openai, data)
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: plan.searchText,
        encoding_format: 'float',
    })
    const retrieved = await retrieve(index, embedding.data[0].embedding, plan)

    const lastMessage = data[data.length - 1]
    const completion = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            ...data.slice(-9, -1),
            { role: 'user', content: lastMessage.content + buildContext(plan, retrieved) },
        ],
        model: 'gpt-4o-mini',
        stream: true,
    })

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content
                    if (content) controller.enqueue(encoder.encode(content))
                }
            } catch (err) {
                controller.error(err)
                return
            }
            controller.close()
        },
    })

    return new NextResponse(stream)
}
