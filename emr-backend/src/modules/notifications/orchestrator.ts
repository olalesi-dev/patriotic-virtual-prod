import { getNotificationTopic } from './registry';
import { assertChannelAllowedForTopic } from './policies/phi.policy';
import type {
    NotificationChannel,
    NotificationDeliveryRecord,
    NotificationMessageRecord,
    NotificationRequest,
    RecipientProfile,
    ScheduleNotificationRequest,
} from './types';

interface PreparedMessage {
    message: Omit<NotificationMessageRecord, 'id'>;
    deliveries: Array<Omit<NotificationDeliveryRecord, 'id'>>;
}

type RecipientPreferences = Record<string, { inApp: boolean; email: boolean } | null>;

export class NotificationOrchestrator {
    prepare(
        request: NotificationRequest | ScheduleNotificationRequest,
        recipients: RecipientProfile[],
        recipientPreferences: RecipientPreferences,
        dedupeKey: string,
    ): PreparedMessage {
        const topic = getNotificationTopic(request.topicKey);
        const requestedChannels = request.channels && request.channels.length > 0
            ? request.channels
            : topic.defaultChannels;

        const channels = requestedChannels.filter((channel) => topic.allowedChannels.includes(channel));
        const now = new Date();
        const scheduledFor = 'sendAt' in request ? request.sendAt : null;

        const message: Omit<NotificationMessageRecord, 'id'> = {
            topicKey: request.topicKey,
            entityId: request.entityId,
            dedupeKey,
            status: 'queued',
            priority: topic.priority,
            category: topic.category,
            containsPHI: topic.containsPHI,
            requiresAudit: topic.requiresAudit,
            actorId: request.actorId ?? null,
            actorName: request.actorName ?? null,
            source: request.source ?? null,
            templateData: request.templateData,
            metadata: request.metadata ?? {},
            scheduledFor,
            createdAt: now,
            updatedAt: now,
        };

        const deliveries: Array<Omit<NotificationDeliveryRecord, 'id'>> = [];

        for (const recipient of recipients) {
            const preferences = recipientPreferences[recipient.uid];
            const enabledChannels = channels.filter((channel) => {
                assertChannelAllowedForTopic(channel, topic.containsPHI);
                if (topic.bypassPreferences) return true;
                if (!preferences) return true;
                if (channel === 'email') return preferences.email;
                if (channel === 'in_app') return preferences.inApp;
                return true;
            });

            for (const channel of enabledChannels) {
                const recipientAddress = channel === 'email'
                    ? recipient.email
                    : channel === 'sms'
                        ? recipient.phone
                        : recipient.uid;

                if (!recipientAddress) {
                    continue;
                }

                deliveries.push({
                    messageId: '',
                    topicKey: request.topicKey,
                    entityId: request.entityId,
                    recipientId: recipient.uid,
                    channel,
                    dedupeKey,
                    status: 'queued',
                    attemptCount: 0,
                    provider: channel === 'email' ? 'sendgrid' : channel === 'sms' ? 'twilio' : 'firestore',
                    providerMessageId: null,
                    providerResponseCode: null,
                    taskName: null,
                    projectedNotificationId: null,
                    scheduledFor,
                    sentAt: null,
                    deliveredAt: null,
                    failedAt: null,
                    lastError: null,
                    metadata: {
                        recipientEmail: recipient.email,
                        recipientPhone: recipient.phone,
                        recipientDisplayName: recipient.displayName,
                        recipientRole: recipient.role,
                    },
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        if (deliveries.length === 0) {
            message.status = 'skipped';
        }

        return {
            message,
            deliveries,
        };
    }
}

