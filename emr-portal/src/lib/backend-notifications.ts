import { getApiUrl } from '@/lib/api-origin';

interface BackendNotificationRequest {
    topicKey: string;
    entityId: string;
    recipientIds: string[];
    templateData: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    dedupeKey?: string;
    channels?: Array<'email' | 'sms' | 'in_app'>;
    actorId?: string | null;
    actorName?: string | null;
    source?: string | null;
    cancelDedupeKeys?: string[];
    followUpSchedules?: Array<{
        topicKey: string;
        entityId: string;
        dedupeKey: string;
        sendAt: string;
        recipientIds?: string[];
        channels?: Array<'email' | 'sms' | 'in_app'>;
        templateData: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    }>;
}

export async function sendBackendNotification(
    authorizationHeader: string,
    payload: BackendNotificationRequest,
): Promise<void> {
    const response = await fetch(getApiUrl('/api/v1/notifications/notify'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: authorizationHeader,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Notification request failed with status ${response.status}.`);
    }
}

interface BackendTemplateEmailRequest {
    templateKey: string;
    toEmail: string;
    templateData: Record<string, unknown>;
}

export async function sendBackendTemplateEmail(
    authorizationHeader: string,
    payload: BackendTemplateEmailRequest,
): Promise<void> {
    const response = await fetch(getApiUrl('/api/v1/notifications/send-template-email'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: authorizationHeader,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Template email request failed with status ${response.status}.`);
    }
}
