import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { documentId, collectionName, text, mediaUrl, authorName, authorId, flaggerId } = body;

        if (!documentId || !collectionName || !flaggerId) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        if (!adminDb) {
            return NextResponse.json({ success: false, error: 'Database not initialized' }, { status: 500 });
        }

        // Update the original document
        const docRef = adminDb.collection(collectionName).doc(documentId);
        await docRef.update({
            moderationStatus: 'pending-review'
        });

        // Log to community-moderation-log
        await adminDb.collection('community-moderation-log').add({
            documentId,
            collectionName,
            text: text || '',
            mediaUrl: mediaUrl || null,
            authorName: authorName || 'Unknown',
            authorId: authorId || 'Unknown',
            aiRiskLevel: 'medium', // Manually flagged counts as medium
            category: 'User Flagged',
            reason: `Manually flagged by user ${flaggerId}`,
            actionTaken: 'pending-review',
            timestamp: new Date(),
            resolved: false
        });

        return NextResponse.json({ success: true, flagged: true });
    } catch (error: any) {
        console.error("Flagging error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
