import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { mapNotificationSnapshot } from '@/lib/server-notifications';

export const dynamic = 'force-dynamic';

function parseLimit(value: string | null): number {
    if (!value) return 25;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 25;
    return Math.max(1, Math.min(parsed, 100));
}

function isMissingIndexError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const typedError = error as Error & { code?: string | number };
    const message = typedError.message.toLowerCase();
    const code = typeof typedError.code === 'number'
        ? String(typedError.code)
        : (typedError.code ?? '').toLowerCase();

    return (
        code === 'failed-precondition' ||
        code === '9' ||
        message.includes('failed_precondition') ||
        message.includes('requires an index')
    );
}

export async function GET(request: Request) {
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
        const url = new URL(request.url);
        const limit = parseLimit(url.searchParams.get('limit'));
        const unreadOnly = url.searchParams.get('unread') === 'true';

        const baseQuery = db.collection('notifications').where('recipientId', '==', user.uid);
        const allSnapshotPromise = baseQuery.get();

        let recentNotifications;
        try {
            const recentSnapshot = await baseQuery.orderBy('createdAt', 'desc').limit(limit).get();
            recentNotifications = recentSnapshot.docs
                .map((notificationDoc) => mapNotificationSnapshot(notificationDoc));
        } catch (recentQueryError) {
            if (!isMissingIndexError(recentQueryError)) {
                throw recentQueryError;
            }

            const allSnapshotForFallback = await allSnapshotPromise;
            recentNotifications = allSnapshotForFallback.docs
                .map((notificationDoc) => mapNotificationSnapshot(notificationDoc))
                .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
                .slice(0, limit);
        }

        const allSnapshot = await allSnapshotPromise;

        const notifications = unreadOnly
            ? recentNotifications.filter((notification) => notification.read === false)
            : recentNotifications;

        const unreadCount = allSnapshot.docs.reduce((total, notificationDoc) => {
            const data = notificationDoc.data() as Record<string, unknown>;
            return data.read === true ? total : total + 1;
        }, 0);

        return NextResponse.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Notification list API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
