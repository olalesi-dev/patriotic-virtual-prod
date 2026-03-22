import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, text, instruction } = body;
        
        if (!text && action === 'autocomplete') {
            return NextResponse.json({ reply: '' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
        }
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        let prompt = '';
        if (action === 'autocomplete') {
            prompt = `You are a medical EMR and CRM AI assistant providing inline text autocomplete. 
The user is currently typing the following text. 
Please provide ONLY the continuation text that logically follows exactly after the very last word the user typed. 
Do not finish the current word if the user is in the middle of it, assume there is a space coming unless it's obvious, but preferably just provide the next few logical words.
DO NOT include any of the original text.
DO NOT include quotes or explanations. 
If the text seems perfectly complete, return an empty string.
Keep the continuation short, no more than 10-15 words.

User Text:
${text}`;
        } else if (action === 'rewrite') {
            prompt = `You are an AI writing assistant in a medical EMR portal. 
Rewrite the following text according to this instruction: "${instruction}". 
Return ONLY the rewritten text. 
Maintain a highly professional, clinical, or business tone appropriate for a medical CRM/EMR system. 
Do not include any conversational filler, quotes, or introductory text.

Text to rewrite:
${text}`;
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        
        // Minor cleanups
        if (action === 'autocomplete') {
            // Strip any matching prefix if the AI hallucinated the last word
            const lastWord = text.trim().split(' ').pop();
            if (lastWord && responseText.toLowerCase().startsWith(lastWord.toLowerCase())) {
                 responseText = responseText.substring(lastWord.length).trim();
            }
        }
        
        return NextResponse.json({ reply: responseText });
    } catch (error: any) {
        console.error("AI Assist API Error:", error);
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}
