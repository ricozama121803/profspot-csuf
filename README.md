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
   OPENAI_API_KEY=...
   PINECONE_API_KEY=...
   # optional, defaults shown
   PINECONE_INDEX=profspot-csuf
   PINECONE_NAMESPACE=csuf
   ```
4. Load data: `pip install -r requirements.txt`, then run `load.ipynb` to create the Pinecone index and upload `reviews.json`.
5. `npm run dev` and open http://localhost:3000.

## Data

`reviews.json` holds CSUF reviews for the ~300 most-reviewed professors, pulled from RateMyProfessors (school ID 166) with `node scripts/scrape-csuf.mjs [maxProfessors] [reviewsPerProfessor]`. Re-run it to refresh the data, then re-run `load.ipynb`. Format: `professor`, `subject`, `stars`, `review`.
