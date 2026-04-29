import crypto from 'crypto';
import type { NotificationTopicKey } from '../types';

function normalizePart(value: string): string {
    return value.trim().toLowerCase();
}

export function buildNotificationDedupeKey(input: {
    topicKey: NotificationTopicKey;
    entityId: string;
    recipientIds: string[];
    channels: string[];
    customKey?: string;
}): string {
    if (input.customKey?.trim()) {
        return input.customKey.trim();
    }

    const basis = [
        input.topicKey,
        normalizePart(input.entityId),
        [...input.recipientIds].map(normalizePart).sort().join(','),
        [...input.channels].map(normalizePart).sort().join(','),
    ].join('|');

    return crypto.createHash('sha256').update(basis).digest('hex');
}

