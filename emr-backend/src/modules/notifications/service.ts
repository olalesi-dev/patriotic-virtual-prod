import { logger } from '../../utils/logger';
import { getNotificationTopic } from './registry';
import { buildNotificationDedupeKey } from './policies/dedupe.policy';
import { dispatchNotificationDelivery } from './jobs/dispatch';
import { NotificationOrchestrator } from './orchestrator';
import { deleteDispatchTask, enqueueDispatchTask } from './queue';
import { NotificationRepository } from './repository';
import type {
    NotificationRequest,
    ScheduleNotificationRequest,
} from './types';

const repository = new NotificationRepository();
const orchestrator = new NotificationOrchestrator();

export class NotificationService {
    async notify(input: NotificationRequest): Promise<{ messageId: string | null; deduped: boolean }> {
        return this.persistAndDispatch(input);
    }

    async schedule(input: ScheduleNotificationRequest): Promise<{ messageId: string | null; deduped: boolean }> {
        return this.persistAndDispatch(input);
    }

    async cancelScheduledByDedupeKey(dedupeKey: string): Promise<void> {
        const message = await repository.findRecentMessageByDedupeKey(dedupeKey, new Date(0));
        if (!message) {
            return;
        }

        await repository.updateMessage(message.id, {
            status: 'cancelled',
        });

        const deliveries = await repository.listDeliveriesByMessageId(message.id);
        await Promise.all(deliveries.map(async (delivery) => {
            const taskName = delivery.taskName;
            if (taskName) {
                try {
                    await deleteDispatchTask(taskName);
                } catch (error) {
                    logger.warn('Failed to delete scheduled notification task', {
                        taskName,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }

            await repository.updateDelivery(delivery.id, {
                status: 'cancelled',
                failedAt: new Date(),
            });
        }));
    }

    private async persistAndDispatch(input: NotificationRequest | ScheduleNotificationRequest): Promise<{ messageId: string | null; deduped: boolean }> {
        const topic = getNotificationTopic(input.topicKey);
        const channels = input.channels && input.channels.length > 0 ? input.channels : topic.defaultChannels;
        const dedupeKey = buildNotificationDedupeKey({
            topicKey: input.topicKey,
            entityId: input.entityId,
            recipientIds: input.recipientIds,
            channels,
            customKey: input.dedupeKey,
        });

        const since = new Date(Date.now() - topic.dedupeWindowSeconds * 1000);
        const existingMessage = await repository.findRecentMessageByDedupeKey(dedupeKey, since);
        if (existingMessage) {
            return {
                messageId: existingMessage.id,
                deduped: true,
            };
        }

        const recipients = await repository.getRecipientProfiles(input.recipientIds);
        const preferenceEntries = await Promise.all(recipients.map(async (recipient) => ({
            uid: recipient.uid,
            preferences: await repository.getCategoryPreferences(recipient.uid),
        })));

        const recipientPreferences = Object.fromEntries(preferenceEntries.map((entry) => [
            entry.uid,
            entry.preferences ? entry.preferences[topic.category] : null,
        ]));

        const prepared = orchestrator.prepare(input, recipients, recipientPreferences, dedupeKey);
        const message = await repository.createMessage(prepared.message);

        if (prepared.deliveries.length === 0) {
            return {
                messageId: message.id,
                deduped: false,
            };
        }

        const deliveries = await repository.createDeliveries(
            prepared.deliveries.map((delivery) => ({
                ...delivery,
                messageId: message.id,
            })),
        );

        for (const delivery of deliveries) {
            const queued = await enqueueDispatchTask(
                { deliveryId: delivery.id },
                {
                    scheduleAt: delivery.scheduledFor,
                    onInlineDispatch: async () => dispatchNotificationDelivery(delivery.id),
                },
            );

            if (queued.taskName) {
                await repository.updateDelivery(delivery.id, {
                    taskName: queued.taskName,
                });
            }
        }

        return {
            messageId: message.id,
            deduped: false,
        };
    }
}

export const notificationService = new NotificationService();
