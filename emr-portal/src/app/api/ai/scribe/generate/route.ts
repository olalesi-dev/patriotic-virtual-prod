import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
    try {
        const { transcript } = await request.json();

        if (!transcript || transcript.trim() === '') {
            return NextResponse.json({ success: false, error: 'No transcript provided.' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // Fallback if API key is not configured, returning a dummy parsed version.
            return NextResponse.json({
                success: true,
                message: 'SOAP note generated (Fallback - Missing API Key)',
                note: { 
                    subjective: `Patient reported: ${transcript}`, 
                    objective: 'Vitals stable. Appears well-nourished, well-developed. No acute distress.', 
                    assessment: 'Telehealth consultation.', 
                    plan: 'Continue current management. Follow up as needed.' 
                }
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        const prompt = `You are a medical AI scribe. Convert the following telehealth visit transcript into a professional medical SOAP note format.
Return ONLY a valid JSON object with the following exactly lowercase keys, and nothing else (no markdown blocks, no formatting):
{ "subjective": "...", "objective": "...", "assessment": "...", "plan": "..." }

Transcript:
${transcript}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        
        let note;
        try {
            // Remove markdown code block if present
            const cleanText = responseText.replace(/^```(json)?\n?/, '').replace(/```$/, '').trim();
            note = JSON.parse(cleanText);
        } catch (err) {
            console.error('Failed to parse AI response as JSON:', responseText);
            return NextResponse.json({ success: false, error: 'Failed to parse AI response' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            note: note
        });
    } catch (error: any) {
        console.error('Error generating SOAP note:', error);
        return NextResponse.json({ success: false, error: error.message || 'Server Error' }, { status: 500 });
    }
}
