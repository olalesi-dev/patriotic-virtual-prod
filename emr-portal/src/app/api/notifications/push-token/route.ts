import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const tokenSchema = z.object({
    token: z.string().trim().min(16).max(4096)
});

export async function POST(request: Request) {
    const { user, errorResponse } = await requireAuthenticatedUser(request);
    if (errorResponse) return errorResponse;
    if (!user) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (!db) {
        return NextResponse.json(
            { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
            { status: 500 }
        );
    }

    try {
        const parsedBody = tokenSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid push token payload.' }, { status: 400 });
        }

        const token = parsedBody.data.token;
        const usersCollection = db.collection('users');
        const existingTokenOwners = await usersCollection
            .where('fcmTokens', 'array-contains', token)
            .get();

        const batch = db.batch();
        existingTokenOwners.docs.forEach((ownerDoc) => {
            if (ownerDoc.id === user.uid) return;
            batch.set(ownerDoc.ref, {
                fcmTokens: FieldValue.arrayRemove(token),
                updatedAt: new Date()
            }, { merge: true });
        });

        batch.set(usersCollection.doc(user.uid), {
            fcmTokens: FieldValue.arrayUnion(token),
            updatedAt: new Date()
        }, { merge: true });

        await batch.commit();

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Push token register API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { user, errorResponse } = await requireAuthenticatedUser(request);
    if (errorResponse) return errorResponse;
    if (!user) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (!db) {
        return NextResponse.json(
            { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
            { status: 500 }
        );
    }

    try {
        const parsedBody = tokenSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid push token payload.' }, { status: 400 });
        }

        await db.collection('users').doc(user.uid).set({
            fcmTokens: FieldValue.arrayRemove(parsedBody.data.token),
            updatedAt: new Date()
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Push token unregister API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
