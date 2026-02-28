import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const updateNotificationSchema = z.object({
    action: z.enum(['mark_read', 'mark_unread'])
});

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

async function resolveNotificationForUser(notificationId: string, userId: string) {
    if (!db) return { docSnap: null, errorResponse: NextResponse.json({ success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` }, { status: 500 }) };

    const docRef = db.collection('notifications').doc(notificationId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        return {
            docSnap: null,
            errorResponse: NextResponse.json({ success: false, error: 'Notification not found.' }, { status: 404 })
        };
    }

    const ownerId = asNonEmptyString(docSnap.data()?.recipientId);
    if (ownerId !== userId) {
        return {
            docSnap: null,
            errorResponse: NextResponse.json({ success: false, error: 'You do not have access to this notification.' }, { status: 403 })
        };
    }

    return { docSnap, errorResponse: null as NextResponse | null };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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
        const parsedBody = updateNotificationSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid notification update payload.' }, { status: 400 });
        }

        const notificationId = params.id;
        if (!notificationId) {
            return NextResponse.json({ success: false, error: 'Notification id is required.' }, { status: 400 });
        }

        const { docSnap, errorResponse: resolveError } = await resolveNotificationForUser(notificationId, user.uid);
        if (resolveError) return resolveError;
        if (!docSnap) {
            return NextResponse.json({ success: false, error: 'Notification not found.' }, { status: 404 });
        }

        const nextReadValue = parsedBody.data.action === 'mark_read';
        await docSnap.ref.update({
            read: nextReadValue,
            updatedAt: new Date()
        });

        return NextResponse.json({ success: true, id: notificationId, read: nextReadValue });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Notification update API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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
        const notificationId = params.id;
        if (!notificationId) {
            return NextResponse.json({ success: false, error: 'Notification id is required.' }, { status: 400 });
        }

        const { docSnap, errorResponse: resolveError } = await resolveNotificationForUser(notificationId, user.uid);
        if (resolveError) return resolveError;
        if (!docSnap) {
            return NextResponse.json({ success: false, error: 'Notification not found.' }, { status: 404 });
        }

        await docSnap.ref.delete();
        return NextResponse.json({ success: true, id: notificationId });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Notification delete API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
