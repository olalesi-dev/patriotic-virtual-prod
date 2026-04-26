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

const verboseNotificationLogs =
    process.env.EMAIL_DEBUG_LOGS === 'true' || process.env.NODE_ENV !== 'production';
const backendNotificationTimeoutMs = Number.parseInt(
    process.env.NOTIFICATION_BACKEND_TIMEOUT_MS ?? '8000',
    10,
);

function getTimeoutSignal(): AbortSignal | undefined {
    if (!Number.isFinite(backendNotificationTimeoutMs) || backendNotificationTimeoutMs <= 0) {
        return undefined;
    }

    return AbortSignal.timeout(backendNotificationTimeoutMs);
}

export async function sendBackendNotification(
    authorizationHeader: string,
    payload: BackendNotificationRequest,
): Promise<void> {
    const url = getApiUrl('/api/v1/notifications/notify');

    if (verboseNotificationLogs) {
        console.info('Forwarding notification request to backend', {
            url,
            topicKey: payload.topicKey,
            entityId: payload.entityId,
            recipientIds: payload.recipientIds,
            channels: payload.channels,
            dedupeKey: payload.dedupeKey,
        });
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: authorizationHeader,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: getTimeoutSignal(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend notification request failed', {
            url,
            topicKey: payload.topicKey,
            entityId: payload.entityId,
            recipientIds: payload.recipientIds,
            status: response.status,
            body: errorText,
        });
        throw new Error(errorText || `Notification request failed with status ${response.status}.`);
    }

    if (verboseNotificationLogs) {
        console.info('Backend notification request accepted', {
            url,
            topicKey: payload.topicKey,
            entityId: payload.entityId,
            recipientIds: payload.recipientIds,
        });
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
    const url = getApiUrl('/api/v1/notifications/send-template-email');

    if (verboseNotificationLogs) {
        console.info('Forwarding template email request to backend', {
            url,
            templateKey: payload.templateKey,
            toEmail: payload.toEmail,
        });
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: authorizationHeader,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: getTimeoutSignal(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend template email request failed', {
            url,
            templateKey: payload.templateKey,
            toEmail: payload.toEmail,
            status: response.status,
            body: errorText,
        });
        throw new Error(errorText || `Template email request failed with status ${response.status}.`);
    }

    if (verboseNotificationLogs) {
        console.info('Backend template email request accepted', {
            url,
            templateKey: payload.templateKey,
            toEmail: payload.toEmail,
        });
    }
}
