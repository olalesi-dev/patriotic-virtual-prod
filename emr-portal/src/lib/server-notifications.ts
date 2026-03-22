import { randomUUID } from 'crypto';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { db, messaging } from '@/lib/firebase-admin';
import type {
    AppNotification,
    AppNotificationType,
    NotificationActionStatus
} from '@/lib/notification-types';

export type NotificationRecord = AppNotification;

interface CreateNotificationInput {
    recipientId: string;
    actorId?: string | null;
    actorName?: string | null;
    type: AppNotificationType;
    title: string;
    body: string;
    href?: string | null;
    metadata?: Record<string, unknown>;
    actionStatus?: NotificationActionStatus;
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function sanitizeText(value: string, maxLength: number): string {
    return value
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, maxLength);
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

function toMetadata(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

function toNotificationRecord(id: string, raw: Record<string, unknown>): NotificationRecord {
    const createdAt = asDate(raw.createdAt) ?? new Date();
    const updatedAt = asDate(raw.updatedAt) ?? createdAt;
    const type = asNonEmptyString(raw.type) as AppNotificationType | null;
    const actionStatusRaw = asNonEmptyString(raw.actionStatus);

    return {
        id,
        recipientId: asNonEmptyString(raw.recipientId) ?? '',
        actorId: asNonEmptyString(raw.actorId),
        actorName: asNonEmptyString(raw.actorName),
        type: type ?? 'appointment_booked',
        title: asNonEmptyString(raw.title) ?? 'Notification',
        body: asNonEmptyString(raw.body) ?? '',
        href: asNonEmptyString(raw.href),
        read: raw.read === true,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        actionStatus: actionStatusRaw === 'pending' || actionStatusRaw === 'accepted' || actionStatusRaw === 'rejected'
            ? actionStatusRaw
            : null,
        metadata: toMetadata(raw.metadata)
    };
}

async function sendPushIfConfigured(notification: NotificationRecord): Promise<void> {
    if (!db || !messaging) return;

    const userDoc = await db.collection('users').doc(notification.recipientId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data() ?? {};
    const rawTokens = Array.isArray(userData.fcmTokens)
        ? userData.fcmTokens
        : [userData.fcmToken];

    const tokens = rawTokens
        .filter((token): token is string => typeof token === 'string' && token.trim().length > 0)
        .map((token) => token.trim())
        .slice(0, 20);

    if (tokens.length === 0) return;

    const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
            title: notification.title,
            body: notification.body
        },
        data: {
            notificationId: notification.id,
            type: notification.type,
            href: notification.href ?? '',
            nonce: randomUUID().slice(0, 8)
        },
        webpush: {
            fcmOptions: {
                link: notification.href ?? '/notifications'
            }
        }
    });

    if (response.failureCount === 0) return;

    const invalidTokens = response.responses
        .map((item, index) => ({ item, token: tokens[index] }))
        .filter(({ item }) => item.success === false)
        .map(({ token }) => token);

    if (invalidTokens.length === 0) return;

    const deduped = new Set<string>(invalidTokens);
    const cleanedTokens = tokens.filter((token) => !deduped.has(token));
    await db.collection('users').doc(notification.recipientId).set(
        {
            fcmTokens: cleanedTokens,
            updatedAt: new Date()
        },
        { merge: true }
    );
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
    if (!db) {
        throw new Error('Firebase Admin database is not initialized on server.');
    }

    const recipientId = sanitizeText(input.recipientId, 120);
    if (!recipientId) {
        throw new Error('Notification recipient is required.');
    }

    const now = new Date();
    const docRef = db.collection('notifications').doc();
    const payload = {
        recipientId,
        actorId: asNonEmptyString(input.actorId),
        actorName: asNonEmptyString(input.actorName),
        type: input.type,
        title: sanitizeText(input.title, 140),
        body: sanitizeText(input.body, 280),
        href: asNonEmptyString(input.href),
        read: false,
        metadata: input.metadata ?? {},
        actionStatus: input.actionStatus ?? null,
        createdAt: now,
        updatedAt: now
    };

    await docRef.set(payload);

    const notification = toNotificationRecord(docRef.id, payload);
    sendPushIfConfigured(notification).catch((error) => {
        console.warn('Push delivery skipped:', error);
    });

    return notification;
}

export function mapNotificationSnapshot(
    snapshot: QueryDocumentSnapshot
): NotificationRecord {
    return toNotificationRecord(snapshot.id, snapshot.data() as Record<string, unknown>);
}
