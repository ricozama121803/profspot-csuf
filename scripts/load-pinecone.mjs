// Embeds reviews.json and upserts it into Pinecone.
// Usage: node --env-file=.env.local scripts/load-pinecone.mjs
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const INDEX = process.env.PINECONE_INDEX || "profspot-csuf";
const NAMESPACE = process.env.PINECONE_NAMESPACE || "csuf";
const { reviews } = JSON.parse(readFileSync("reviews.json", "utf-8"));

const openai = new OpenAI();
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const existing = (await pc.listIndexes()).indexes?.map((i) => i.name) ?? [];
if (!existing.includes(INDEX)) {
  await pc.createIndex({
    name: INDEX, dimension: 1536, metric: "cosine",
    spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    waitUntilReady: true,
  });
  console.log(`created index ${INDEX}`);
}
const index = pc.index(INDEX).namespace(NAMESPACE);

for (let start = 0; start < reviews.length; start += 100) {
  const batch = reviews.slice(start, start + 100);
  const res = await openai.embeddings.create({ model: "text-embedding-3-small", input: batch.map((r) => r.review) });
  await index.upsert(batch.map((r, i) => ({
    id: `${start + i}-${r.professor}`,
    values: res.data[i].embedding,
    metadata: { professor: r.professor, review: r.review, subject: r.subject, stars: r.stars },
  })));
  console.log(`upserted ${Math.min(start + 100, reviews.length)}/${reviews.length}`);
}
console.log((await pc.index(INDEX).describeIndexStats()).namespaces);
