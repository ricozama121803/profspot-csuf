# ProfSpot CSUF

**ProfSpot CSUF** is a chatbot for Cal State Fullerton students that uses Retrieval-Augmented Generation (RAG) to find and summarize professor reviews. It is a CSUF-focused version of [HEADSTARTERTEAM-AiRateMyProfessor](https://github.com/ricozama121803/HEADSTARTERTEAM-AiRateMyProfessor).

## Features

- **Professor search**: ask in plain English ("easy CPSC 120 professor with good labs").
- **AI-powered insights**: top-3 recommendations summarized from reviews retrieved from a vector database.

## Tech stack

Next.js, React, Material-UI, OpenAI (`text-embedding-3-small`, `gpt-4o-mini`), Pinecone, Jupyter (data loading).

## Setup

1. `git clone https://github.com/ricozama121803/profspot-csuf.git && cd profspot-csuf`
2. `npm install`
3. Create `.env.local`:
   ```
   OPENAI_API_KEY=...      # embeddings only
   ANTHROPIC_API_KEY=...   # query planning + answers (Claude Haiku 4.5)
   PINECONE_API_KEY=...
   NEXT_PUBLIC_SUPABASE_URL=...        # Supabase project URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # Supabase anon (public) key
   CRON_SECRET=...                     # any long random string; also set it in Vercel
   # optional, defaults shown
   ANTHROPIC_MODEL=claude-haiku-4-5-20251001
   PINECONE_INDEX=profspot-csuf
   PINECONE_NAMESPACE=csuf
   ```
4. Get the data and load it into Pinecone (one time, ~20 min plus ~$0.20 of OpenAI embeddings):
   ```
   node scripts/scrape-csuf.mjs
   node --env-file=.env.local scripts/load-pinecone.mjs
   ```
5. `npm run dev` and open http://localhost:3000.

## Supabase keep-alive

Free-tier Supabase projects pause after ~7 days of inactivity. `vercel.json` schedules `GET /api/keepalive` every 3 days; it runs a real query against a tiny `keepalive` table. One-time setup: run `supabase/keepalive.sql` in the Supabase SQL editor, then set the three env vars above in Vercel (Vercel sends `CRON_SECRET` as a bearer token automatically).

## How it works

- **Saved professors:** each professor in an answer has a 📌 button and a link to their RateMyProfessors page. Saved professors (with optional notes) are stored in the browser's `localStorage` only, with no login, and can be exported as a PDF with clickable RMP links.

- **Data:** `scripts/scrape-csuf.mjs` pulls every rated CSUF professor (~5,000) and all of their reviews (~120,000) from RateMyProfessors. It is resumable, so re-run it to continue after an interruption. Output goes to `data/` (git-ignored) and `app/departments.json`.
- **Index:** `scripts/load-pinecone.mjs` stores one vector per professor profile (rating, difficulty, would-take-again, courses, tags) and one per review, each with filterable metadata (department, course, year, rating).
- **Retrieval** (`app/api/chat/route.js`): a small LLM call turns the question into a search plan (department, course codes, "best"/"easiest" sorting, minimum rating). Pinecone then filters by that plan and ranks by semantic similarity, and the chat model answers using each professor's real stats plus their best-matching reviews.
