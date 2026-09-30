// Embeds professor profiles + reviews from data/ and upserts them into Pinecone (replaces the namespace).
// Usage: node --env-file=.env.local scripts/load-pinecone.mjs
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const INDEX = process.env.PINECONE_INDEX || "profspot-csuf";
const NAMESPACE = process.env.PINECONE_NAMESPACE || "csuf";
const EMBED_BATCH = 200;
const CONCURRENCY = 3;

const readNdjson = (f) => readFileSync(f, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const normCourse = (c) => (c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));

const professors = readNdjson("data/professors.ndjson");
const reviews = readNdjson("data/reviews.ndjson");
const profById = new Map(professors.map((p) => [p.id, p]));

// ---- build records: { id, text (to embed), metadata } ----
const records = [];

for (const p of professors) {
  const name = `${p.firstName} ${p.lastName}`;
  const courses = [...p.courseCodes].sort((a, b) => b.courseCount - a.courseCount).map((c) => normCourse(c.courseName)).filter(Boolean);
  const uniqueCourses = [...new Set(courses)].slice(0, 15);
  const tags = [...p.teacherRatingTags].sort((a, b) => b.tagCount - a.tagCount).slice(0, 6).map((t) => t.tagName);
  const wta = p.wouldTakeAgainPercent >= 0 ? Math.round(p.wouldTakeAgainPercent) : null;
  const text =
    `${name}, ${p.department} professor at Cal State Fullerton. Overall rating ${p.avgRating}/5 from ${p.numRatings} ratings, ` +
    `difficulty ${p.avgDifficulty}/5` + (wta !== null ? `, ${wta}% would take again` : "") + `. ` +
    (uniqueCourses.length ? `Teaches ${uniqueCourses.join(", ")}. ` : "") + (tags.length ? `Known for: ${tags.join(", ")}.` : "");
  records.push({
    id: `prof-${p.legacyId}`,
    text,
    metadata: clean({
      type: "professor", professor: name, department: p.department, avgRating: p.avgRating, avgDifficulty: p.avgDifficulty,
      wouldTakeAgain: wta, numRatings: p.numRatings, courses: uniqueCourses, tags,
    }),
  });
}

reviews.forEach((r, i) => {
  const p = profById.get(r.professorId);
  const comment = (r.comment || "").trim();
  if (!p || comment.length < 15) return;
  const name = `${p.firstName} ${p.lastName}`;
  const course = normCourse(r.class);
  const year = Number((r.date || "").slice(0, 4)) || null;
  records.push({
    id: `rev-${i}`,
    text: `${name} (${p.department}${course ? `, ${course}` : ""}): ${comment}`.slice(0, 6000),
    metadata: clean({
      type: "review", professorId: `prof-${p.legacyId}`, professor: name, department: p.department, course,
      stars: Math.round(((r.helpfulRating + r.clarityRating) / 2) * 10) / 10, difficulty: r.difficultyRating,
      year, grade: r.grade, tags: r.ratingTags ? r.ratingTags.split("--").map((t) => t.trim()).filter(Boolean) : null,
      text: comment.slice(0, 1200),
    }),
  });
});
console.log(`${professors.length} professors, ${records.length - professors.length} reviews -> ${records.length} vectors`);

// ---- embed + upsert ----
const openai = new OpenAI();
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const existing = (await pc.listIndexes()).indexes?.map((i) => i.name) ?? [];
if (!existing.includes(INDEX)) {
  await pc.createIndex({
    name: INDEX, dimension: 1536, metric: "cosine",
    spec: { serverless: { cloud: "aws", region: "us-east-1" } }, waitUntilReady: true,
  });
  console.log(`created index ${INDEX}`);
}
const index = pc.index(INDEX).namespace(NAMESPACE);
await index.deleteAll().catch(() => {}); // namespace may not exist yet
console.log(`cleared namespace ${NAMESPACE}`);

let next = 0, done = 0;
async function worker() {
  while (next < records.length) {
    const start = next;
    next += EMBED_BATCH;
    const batch = records.slice(start, start + EMBED_BATCH);
    const res = await openai.embeddings.create({ model: "text-embedding-3-small", input: batch.map((r) => r.text) });
    const vectors = batch.map((r, i) => ({ id: r.id, values: res.data[i].embedding, metadata: r.metadata }));
    for (let i = 0; i < vectors.length; i += 100) await index.upsert(vectors.slice(i, i + 100));
    done += batch.length;
    if (Math.floor(done / 5000) !== Math.floor((done - batch.length) / 5000)) console.log(`${done}/${records.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log("done", (await pc.index(INDEX).describeIndexStats()).namespaces);
