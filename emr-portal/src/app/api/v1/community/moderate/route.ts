import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db as adminDb } from '@/lib/firebase-admin';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { documentId, collectionName, text, mediaUrl, authorName, uid } = body;

        if (!documentId || !collectionName || !text) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        if (!adminDb) {
            return NextResponse.json({ success: false, error: 'Database not initialized' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: `You are an AI moderator for a health community platform. 
Your job is to screen posts for personally identifiable health information (PHI), severe clinical advice, harassment, or high-risk content.
Analyze the user's text and optional media URL description.
Respond strictly in valid JSON format with the following keys:
- "safe": boolean
- "riskLevel": string ("low", "medium", or "high")
- "category": string (e.g., "Safe", "PHI", "Clinical Advice", "Harassment", "Spam", "Self-Harm")
- "reason": string (short explanation)

Rules:
1. Low risk: General health discussion, safe.
2. Medium risk: Borderline content, mild complaints, requesting general insight.
3. High risk: explicit PHI (names with diagnoses), dangerous medical advice, self-harm, harassment.`
        });

        const prompt = `Text content: "${text}"\nMedia URL: "${mediaUrl || 'None'}"`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        
        // Strip markdown blocks if present
        if (responseText.startsWith('```json')) {
            responseText = responseText.substring(7);
            if (responseText.endsWith('```')) {
                responseText = responseText.substring(0, responseText.length - 3);
            }
        }

        let moderationResult;
        try {
            moderationResult = JSON.parse(responseText);
        } catch (e) {
            moderationResult = { safe: true, riskLevel: 'low', category: 'Safe', reason: 'Failed to parse AI response' };
        }

        const statusMap: Record<string, string> = {
            'high': 'ai-flagged',
            'medium': 'pending-review',
            'low': 'approved'
        };

        const moderationStatus = statusMap[moderationResult.riskLevel] || 'pending-review';
        const hidden = moderationResult.riskLevel === 'high';

        // 1. Update the original document
        const docRef = adminDb.collection(collectionName).doc(documentId);
        await docRef.update({
            moderationStatus,
            hidden
        });

        // 2. Log to community-moderation-log
        await adminDb.collection('community-moderation-log').add({
            documentId,
            collectionName,
            text,
            mediaUrl: mediaUrl || null,
            authorName,
            authorId: uid,
            aiRiskLevel: moderationResult.riskLevel,
            category: moderationResult.category,
            reason: moderationResult.reason,
            actionTaken: moderationStatus,
            timestamp: new Date(),
            resolved: false
        });

        return NextResponse.json({ success: true, moderationResult });
    } catch (error: any) {
        console.error("Moderation error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
