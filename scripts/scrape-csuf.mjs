// Pulls CSUF professors + reviews from RateMyProfessors' GraphQL endpoint into reviews.json.
// Usage: node scripts/scrape-csuf.mjs [maxProfessors=300] [reviewsPerProfessor=6]
import { writeFileSync } from "node:fs";

const SCHOOL_ID = Buffer.from("School-166").toString("base64"); // CSUF
const MAX_PROFS = Number(process.argv[2] || 300);
const PER_PROF = Number(process.argv[3] || 6);
const DELAY_MS = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gql = async (query, variables) => {
  const res = await fetch("https://www.ratemyprofessors.com/graphql", {
    method: "POST",
    headers: { Authorization: "Basic dGVzdDp0ZXN0", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
};

const LIST = `query($q:TeacherSearchQuery!,$after:String){newSearch{teachers(query:$q,first:100,after:$after){
  pageInfo{hasNextPage endCursor} edges{node{id firstName lastName department numRatings}}}}}`;
const RATINGS = `query($id:ID!,$n:Int){node(id:$id){... on Teacher{ratings(first:$n){edges{node{comment class date helpfulRating clarityRating}}}}}}`;

const teachers = [];
let after = null;
do {
  const { newSearch } = await gql(LIST, { q: { text: "", schoolID: SCHOOL_ID }, after });
  teachers.push(...newSearch.teachers.edges.map((e) => e.node));
  after = newSearch.teachers.pageInfo.hasNextPage ? newSearch.teachers.pageInfo.endCursor : null;
  console.log(`listed ${teachers.length}`);
  await sleep(DELAY_MS);
} while (after);

const top = teachers.filter((t) => t.numRatings >= 5).sort((a, b) => b.numRatings - a.numRatings).slice(0, MAX_PROFS);
const reviews = [];
for (const [i, t] of top.entries()) {
  try {
    const { node } = await gql(RATINGS, { id: t.id, n: PER_PROF });
    for (const { node: r } of node.ratings.edges) {
      const comment = (r.comment || "").trim();
      if (comment.length < 30) continue;
      reviews.push({
        professor: `${t.firstName} ${t.lastName}`,
        subject: r.class ? `${r.class} (${t.department})` : t.department,
        stars: Math.round((r.helpfulRating + r.clarityRating) / 2),
        review: comment,
      });
    }
  } catch (e) {
    console.error(`skip ${t.firstName} ${t.lastName}: ${e.message}`);
  }
  if ((i + 1) % 25 === 0) console.log(`reviews: ${i + 1}/${top.length} professors`);
  await sleep(DELAY_MS);
}

writeFileSync("reviews.json", JSON.stringify({ reviews }, null, 2));
console.log(`wrote ${reviews.length} reviews for ${top.length} professors`);
