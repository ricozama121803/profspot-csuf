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

`reviews.json` currently holds **clearly labeled sample data** (fictional professors, prefixed `SAMPLE:`) so the app works out of the box. Replace it with real reviews in the same format (`professor`, `subject`, `stars`, `review`) before any real use. `app/scraping/scraping.js` is an optional Playwright scraper for RateMyProfessors pages; check the site's terms of service before using it.
