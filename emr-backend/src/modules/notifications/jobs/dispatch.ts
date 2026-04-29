import { logger } from '../../../utils/logger';
import { SendGridAdapter } from '../channels/sendgrid.adapter';
import { TwilioAdapter } from '../channels/twilio.adapter';
import { getNotificationTopic } from '../registry';
import { NotificationRepository } from '../repository';
import { getRetryDelaySeconds } from '../policies/retry.policy';
import { resolveTemplateId } from '../templates/template.mapper';
import { enqueueDispatchTask } from '../queue';

const repository = new NotificationRepository();
const sendGridAdapter = new SendGridAdapter();
const twilioAdapter = new TwilioAdapter();
const verboseEmailLogs = process.env.EMAIL_DEBUG_LOGS === 'true' || process.env.NODE_ENV !== 'production';

function asString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function eventIdFromWebhookPayload(payload: Record<string, unknown>): string {
    const sgEventId = asString(payload.sg_event_id);
    if (sgEventId) return sgEventId;

    const email = asString(payload.email) ?? 'unknown';
    const event = asString(payload.event) ?? 'event';
    const timestamp = String(payload.timestamp ?? '0');
    const messageId = asString(payload.sg_message_id) ?? asString(payload.notificationDeliveryId) ?? 'message';
    return `${event}:${timestamp}:${email}:${messageId}`;
}

export async function dispatchNotificationDelivery(deliveryId: string): Promise<void> {
    const delivery = await repository.getDelivery(deliveryId);
    if (!delivery) {
        throw new Error(`Notification delivery ${deliveryId} was not found.`);
    }

    if (['sent', 'delivered', 'bounced', 'cancelled', 'skipped'].includes(delivery.status)) {
        return;
    }

    const message = await repository.getMessage(delivery.messageId);
    if (!message) {
        throw new Error(`Notification message ${delivery.messageId} was not found.`);
    }

    if (message.status === 'cancelled') {
        await repository.updateDelivery(delivery.id, {
            status: 'cancelled',
            failedAt: new Date(),
        });
        return;
    }

    const topic = getNotificationTopic(delivery.topicKey);
    const recipient = (await repository.getRecipientProfiles([delivery.recipientId]))[0];
    if (!recipient) {
        throw new Error(`Notification recipient ${delivery.recipientId} was not found.`);
    }

    await repository.updateDelivery(delivery.id, {
        status: 'processing',
        attemptCount: delivery.attemptCount + 1,
    });

    try {
        if (delivery.channel === 'email') {
            const templateKey = topic.templateKey;
            if (!templateKey) {
                throw new Error(`Topic ${delivery.topicKey} is missing a SendGrid template mapping.`);
            }
            if (!recipient.email) {
                throw new Error(`Recipient ${recipient.uid} does not have an email address.`);
            }

            if (verboseEmailLogs) {
                logger.info('Dispatching notification email delivery', {
                    deliveryId: delivery.id,
                    messageId: message.id,
                    topicKey: delivery.topicKey,
                    recipientId: recipient.uid,
                    recipientEmail: recipient.email,
                    templateKey,
                    dedupeKey: delivery.dedupeKey,
                    scheduledFor: delivery.scheduledFor?.toISOString() ?? null,
                });
            }

            const result = await sendGridAdapter.send({
                to: recipient.email,
                fromEmail: topic.fromEmail,
                replyTo: topic.replyTo,
                templateId: await resolveTemplateId(templateKey),
                templateData: message.templateData,
                customArgs: {
                    notificationMessageId: message.id,
                    notificationDeliveryId: delivery.id,
                    topicKey: message.topicKey,
                    entityId: message.entityId,
                },
            });

            await repository.updateDelivery(delivery.id, {
                status: 'sent',
                sentAt: new Date(),
                providerMessageId: result.providerMessageId,
                providerResponseCode: result.responseCode,
                lastError: null,
            });
        } else if (delivery.channel === 'sms') {
            const smsBody = topic.buildSmsBody?.(message.templateData);
            if (!smsBody) {
                throw new Error(`Topic ${delivery.topicKey} cannot be sent by SMS.`);
            }
            if (!recipient.phone) {
                throw new Error(`Recipient ${recipient.uid} does not have a phone number.`);
            }

            const result = await twilioAdapter.send(recipient.phone, smsBody);
            await repository.updateDelivery(delivery.id, {
                status: 'sent',
                sentAt: new Date(),
                providerMessageId: result.providerMessageId,
                lastError: null,
            });
        } else {
            const inboxType = topic.inboxType;
            const inboxTitle = topic.buildInboxTitle(message.templateData);
            const inboxBody = topic.buildInboxBody(message.templateData);

            if (!inboxType || !inboxTitle || !inboxBody) {
                await repository.updateDelivery(delivery.id, {
                    status: 'skipped',
                    deliveredAt: new Date(),
                });
                return;
            }

            const notificationId = await repository.projectInAppNotification({
                deliveryId: delivery.id,
                recipientId: delivery.recipientId,
                actorId: message.actorId,
                actorName: message.actorName,
                type: inboxType,
                title: inboxTitle,
                body: inboxBody,
                href: topic.buildHref?.(message.templateData) ?? null,
                priority: message.priority,
                metadata: {
                    ...message.metadata,
                    topicKey: message.topicKey,
                    entityId: message.entityId,
                },
                source: message.source,
            });

            await repository.updateDelivery(delivery.id, {
                status: 'delivered',
                deliveredAt: new Date(),
                projectedNotificationId: notificationId,
                lastError: null,
            });
        }

        await repository.updateMessage(message.id, {
            status: 'completed',
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const retryDelay = getRetryDelaySeconds(message.priority, delivery.attemptCount);

        if (retryDelay !== null) {
            const nextAttempt = new Date(Date.now() + retryDelay * 1000);
            const queued = await enqueueDispatchTask(
                { deliveryId: delivery.id },
                {
                    scheduleAt: nextAttempt,
                    onInlineDispatch: async () => dispatchNotificationDelivery(delivery.id),
                },
            );

            await repository.updateDelivery(delivery.id, {
                status: 'retry_scheduled',
                lastError: errorMessage,
                taskName: queued.taskName,
            });
        } else {
            await repository.updateDelivery(delivery.id, {
                status: 'failed',
                failedAt: new Date(),
                lastError: errorMessage,
            });
        }

        logger.error('Notification dispatch failed', {
            deliveryId: delivery.id,
            messageId: message.id,
            topicKey: delivery.topicKey,
            channel: delivery.channel,
            recipientId: delivery.recipientId,
            recipientEmail: recipient.email ?? null,
            provider: delivery.provider,
            attemptCount: delivery.attemptCount + 1,
            error: errorMessage,
        });
    }
}

export async function processSendGridWebhookEvents(events: Record<string, unknown>[]): Promise<void> {
    for (const event of events) {
        const providerEventId = eventIdFromWebhookPayload(event);
        const existingEvent = await repository.findEventByProviderEventId(providerEventId);
        if (existingEvent) {
            continue;
        }

        const deliveryId = asString(event.notificationDeliveryId);
        const providerMessageId = asString(event.sg_message_id);
        const matchedDelivery = deliveryId
            ? await repository.getDelivery(deliveryId)
            : providerMessageId
                ? await repository.findDeliveryByProviderMessageId(providerMessageId)
                : null;

        const eventType = asString(event.event) ?? 'unknown';
        const occurredAt = typeof event.timestamp === 'number'
            ? new Date(event.timestamp * 1000)
            : new Date();

        await repository.recordEvent({
            deliveryId: matchedDelivery?.id ?? null,
            provider: 'sendgrid',
            eventType,
            providerEventId,
            providerMessageId,
            payload: event,
            occurredAt,
            processedAt: new Date(),
        });

        if (!matchedDelivery) {
            if (verboseEmailLogs) {
                logger.info('Recorded unmatched SendGrid webhook event', {
                    providerEventId,
                    providerMessageId,
                    eventType,
                    email: asString(event.email),
                });
            }
            continue;
        }

        if (eventType === 'delivered') {
            await repository.updateDelivery(matchedDelivery.id, {
                status: 'delivered',
                deliveredAt: occurredAt,
            });
        } else if (eventType === 'bounce' || eventType === 'dropped') {
            await repository.updateDelivery(matchedDelivery.id, {
                status: 'bounced',
                failedAt: occurredAt,
                lastError: asString(event.reason) ?? eventType,
            });
        } else if (eventType === 'deferred') {
            await repository.updateDelivery(matchedDelivery.id, {
                status: 'retry_scheduled',
                lastError: asString(event.response) ?? eventType,
            });
        } else if (eventType === 'processed') {
            await repository.updateDelivery(matchedDelivery.id, {
                status: 'sent',
                sentAt: occurredAt,
            });
        }

        if (verboseEmailLogs) {
            logger.info('Processed SendGrid webhook event', {
                deliveryId: matchedDelivery.id,
                providerEventId,
                providerMessageId,
                eventType,
                occurredAt: occurredAt.toISOString(),
            });
        }
    }
}
