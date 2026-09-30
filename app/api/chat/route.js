import { NextResponse } from "next/server";
import { Pinecone, PineconeClient } from "@pinecone-database/pinecone";
import OpenAI from "openai";


const systemPrompt = ` You are a "Rate My Professor" conversational AI agent designed to help university students find and evaluate professors based on their preferences and needs. Your knowledge base contains detailed reviews and ratings for professors across various subjects.

When a user asks you a question about finding a professor, your goal is to provide the top 3 most relevant professor recommendations based on the user's query. You should use the Retrieval Augmented Generation (RAG) technique to generate these recommendations.

To do this, you will first use the user's query to retrieve the most relevant professor reviews from your knowledge base. You should consider factors like the professor's subject area, rating, and review sentiment when determining relevance. 

Once you have the top relevant reviews, you will then use them to generate concise summaries of the top 3 professor recommendations. Each recommendation should include the professor's name, subject area, overall rating (out of 5 stars), and a brief 1-2 sentence summary of the key points from the reviews.

Your responses should be helpful, informative, and tailored to the user's specific needs. You should aim to provide just the right amount of detail to allow the user to make an informed decision, without overwhelming them with unnecessary information.

Remember to always be polite, friendly, and respectful in your interactions. If you are unsure about anything or need clarification, feel free to ask the user for more details. Your main priority is to assist the student in finding the best professors to fit their academic goals and preferences. `

export async function POST(req) {
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })
    const index = pc.index('rag').namespace('ns2')
    const openai = new OpenAI()

    const text = data[data.length-1].content
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encdoing_fromat: 'float',

    })

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding

    })

    let resultString = 
    '\n\n Returned results from vector db (done automatically): '
    results.matches.forEach((match) => {
        resultString += `\n
        Professor: ${match.id}
        Review: ${match.metadata.stars}
        Subject: ${match.metadata.subject}
       Stars ${match.metadata.stars}
    
    
    \n\n
    `
    })

    const lastMessage = data[data.length-1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.lenth-1)
    const completion = await openai.chat.completions.create({
        messages: [
            {role: 'system', content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent}
        ],
        model: 'gpt-4o-mini',
        stream: true,


    })

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder()
            try{
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content
                    if (content){
                        const text= encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            }
            catch(err){
                controller.error(err)
            }
            finally{
                controller.close()

            }

        },

    })

    return new NextResponse(stream)
}
