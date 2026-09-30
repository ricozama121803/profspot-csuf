// Scrapes ALL CSUF professors (with ratings) and ALL their reviews from RateMyProfessors' GraphQL endpoint.
// Output (resumable; re-run to continue after an interruption):
//   data/professors.ndjson  one professor profile per line
//   data/reviews.ndjson     one review per line
//   app/departments.json    department names (used by the chat route to interpret queries)
// Usage: node scripts/scrape-csuf.mjs [--fresh]
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from "node:fs";

const SCHOOL_ID = Buffer.from("School-166").toString("base64"); // CSUF
const CONCURRENCY = 4;
const DELAY_MS = 150;
const PROF_FILE = "data/professors.ndjson";
const REV_FILE = "data/reviews.ndjson";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gql(query, variables, attempt = 0) {
  try {
    const res = await fetch("https://www.ratemyprofessors.com/graphql", {
      method: "POST",
      headers: { Authorization: "Basic dGVzdDp0ZXN0", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 200));
    return json.data;
  } catch (e) {
    if (attempt >= 4) throw e;
    await sleep(1000 * 2 ** attempt);
    return gql(query, variables, attempt + 1);
  }
}

const LIST = `query($q:TeacherSearchQuery!,$after:String){newSearch{teachers(query:$q,first:100,after:$after){
  pageInfo{hasNextPage endCursor} edges{node{id numRatings}}}}}`;
const TEACHER = `query($id:ID!,$after:String){node(id:$id){... on Teacher{
  id legacyId firstName lastName department avgRating avgDifficulty wouldTakeAgainPercent numRatings
  courseCodes{courseName courseCount} teacherRatingTags{tagName tagCount}
  ratings(first:100,after:$after){pageInfo{hasNextPage endCursor}
    edges{node{comment class date helpfulRating clarityRating difficultyRating wouldTakeAgain grade ratingTags thumbsUpTotal}}}}}}`;

if (process.argv.includes("--fresh")) for (const f of [PROF_FILE, REV_FILE]) existsSync(f) && rmSync(f);
mkdirSync("data", { recursive: true });

const done = new Set(
  existsSync(PROF_FILE) ? readFileSync(PROF_FILE, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l).id) : []
);
console.log(`resuming: ${done.size} professors already done`);
// drop orphan reviews from a professor that was interrupted mid-scrape (they get re-fetched below)
if (existsSync(REV_FILE)) {
  const kept = readFileSync(REV_FILE, "utf-8").split("\n").filter((l) => l && done.has(JSON.parse(l).professorId));
  writeFileSync(REV_FILE, kept.length ? kept.join("\n") + "\n" : "");
}

// 1. list every professor with at least one rating
const ids = [];
let after = null;
do {
  const { newSearch } = await gql(LIST, { q: { text: "", schoolID: SCHOOL_ID }, after });
  for (const { node } of newSearch.teachers.edges) if (node.numRatings > 0) ids.push(node.id);
  after = newSearch.teachers.pageInfo.hasNextPage ? newSearch.teachers.pageInfo.endCursor : null;
  await sleep(DELAY_MS);
} while (after);
console.log(`${ids.length} rated professors`);

// 2. fetch each professor's profile + all reviews
const todo = ids.filter((id) => !done.has(id));
let finished = 0, reviewCount = 0;
const departments = new Set();

async function scrapeTeacher(id) {
  let after = null, profile = null;
  const reviews = [];
  do {
    const { node } = await gql(TEACHER, { id, after });
    if (!node) return;
    profile ??= node;
    for (const { node: r } of node.ratings.edges) reviews.push(r);
    after = node.ratings.pageInfo.hasNextPage ? node.ratings.pageInfo.endCursor : null;
    await sleep(DELAY_MS);
  } while (after);

  const { ratings, ...rest } = profile;
  // reviews first, then the profile line: the profile line marks the professor as complete
  if (reviews.length)
    appendFileSync(REV_FILE, reviews.map((r) => JSON.stringify({ professorId: id, ...r })).join("\n") + "\n");
  appendFileSync(PROF_FILE, JSON.stringify(rest) + "\n");
  reviewCount += reviews.length;
}

let next = 0;
async function worker() {
  while (next < todo.length) {
    const id = todo[next++];
    try {
      await scrapeTeacher(id);
    } catch (e) {
      console.error(`skip ${id}: ${e.message}`);
    }
    if (++finished % 100 === 0) console.log(`${finished}/${todo.length} professors, ${reviewCount} reviews this run`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

for (const l of readFileSync(PROF_FILE, "utf-8").split("\n").filter(Boolean)) {
  const d = JSON.parse(l).department;
  if (d) departments.add(d);
}
writeFileSync("app/departments.json", JSON.stringify([...departments].sort(), null, 2));
console.log(`done. ${departments.size} departments written to app/departments.json`);
