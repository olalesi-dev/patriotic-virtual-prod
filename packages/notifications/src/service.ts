import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as schema from '@workspace/db';
import { notificationRepository, type Db } from '@workspace/db';
import { NotificationQueue } from '@workspace/queue';
import { getNotificationTopic } from './registry';
import { buildNotificationDedupeKey } from './policies/dedupe.policy';
import { assertChannelAllowedForTopic } from './policies/phi.policy';
import type {
  NotificationRequest,
  NotificationChannel,
  RecipientProfile,
} from './types';
import { sendTemplateEmail } from '@workspace/email';

export class NotificationService {
  private readonly repo: ReturnType<typeof notificationRepository>;

  constructor(
    private readonly db: Db,
    private readonly queue: NotificationQueue,
  ) {
    this.repo = notificationRepository(db);
  }

  async notify(request: NotificationRequest) {
    const topic = getNotificationTopic(request.topicKey);
    if (!topic) {
      throw new Error(`Unknown notification topic: ${request.topicKey}`);
    }

    const dedupeKey =
      request.dedupeKey ??
      buildNotificationDedupeKey({
        topicKey: request.topicKey,
        entityId: request.entityId,
        recipientIds: request.recipientIds,
        channels: request.channels ?? topic.defaultChannels,
      });

    // Check for recent duplicate
    const existing = await this.repo.getRecentDedupeKey(
      dedupeKey,
      request.topicKey,
    );
    if (existing && topic.dedupeWindowSeconds > 0) {
      const windowMs = topic.dedupeWindowSeconds * 1000;
      if (Date.now() - existing.createdAt.getTime() < windowMs) {
        return { messageId: existing.id, status: 'skipped_duplicate' };
      }
    }

    const message = await this.repo.createMessage({
      topicKey: request.topicKey,
      entityId: request.entityId,
      dedupeKey,
      priority: topic.priority,
      category: topic.category,
      containsPhi: topic.containsPHI,
      requiresAudit: topic.requiresAudit,
      templateData: request.templateData,
      metadata: request.metadata ?? {},
      actorId: request.actorId,
      actorName: request.actorName,
      source: request.source,
      status: 'queued',
    });

    const results = [];
    for (const recipientId of request.recipientIds) {
      const profile = await this.lookupRecipientProfile(recipientId);
      if (!profile) continue;

      const recipient = await this.repo.addRecipient({
        messageId: message.id,
        recipientId: profile.uid,
        email: profile.email,
        phone: profile.phone,
        displayName: profile.displayName,
        role: profile.role,
      });

      const channels = request.channels ?? topic.defaultChannels;
      const deliveries = [];

      for (const channel of channels) {
        if (!topic.allowedChannels.includes(channel)) continue;

        try {
          assertChannelAllowedForTopic(channel, topic.containsPHI);
        } catch {
          continue;
        }

        // Check user preferences unless bypassed
        if (!topic.bypassPreferences) {
          const prefs = await this.repo.getUserPreferences(recipientId);
          const categoryPrefs = prefs.find((p) => p.category === topic.category);
          if (categoryPrefs) {
            if (channel === 'email' && !categoryPrefs.emailEnabled) continue;
            if (channel === 'sms' && !categoryPrefs.smsEnabled) continue;
            if (channel === 'in_app' && !categoryPrefs.inAppEnabled) continue;
          } else if (
            channel !== 'in_app' &&
            !topic.defaultChannels.includes(channel)
          ) {
            continue;
          }
        }

        const delivery = await this.repo.createDelivery({
          messageRecipientId: recipient.id,
          channel,
          status: 'queued',
        });

        const enqueueResult = await this.queue.enqueue(
          { deliveryId: delivery.id },
          {
            onInlineDispatch: () => this.processDelivery(delivery.id),
          },
        );

        if (enqueueResult.jobId) {
          await this.repo.updateDelivery(delivery.id, {
            taskName: enqueueResult.jobId,
          });
        }

        deliveries.push({ channel, deliveryId: delivery.id });
      }

      results.push({ recipientId, deliveries });
    }

    return { messageId: message.id, results };
  }

  async processDelivery(deliveryId: string) {
    return await this.db.transaction(async (tx) => {
      const [delivery] = await tx
        .select()
        .from(schema.notificationDeliveries)
        .where(eq(schema.notificationDeliveries.id, deliveryId))
        .limit(1);

      if (!delivery || delivery.status !== 'queued') return;

      await tx
        .update(schema.notificationDeliveries)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(schema.notificationDeliveries.id, deliveryId));

      const [recipient] = await tx
        .select()
        .from(schema.notificationRecipients)
        .where(eq(schema.notificationRecipients.id, delivery.messageRecipientId))
        .limit(1);

      const [message] = await tx
        .select()
        .from(schema.notificationMessages)
        .where(eq(schema.notificationMessages.id, recipient.messageId))
        .limit(1);

      const topic = getNotificationTopic(message.topicKey as any);
      if (!topic) throw new Error(`Unknown topic ${message.topicKey}`);

      try {
        if (delivery.channel === 'email') {
          if (!recipient.email) throw new Error('Recipient has no email');
          if (!topic.templateKey)
            throw new Error('Topic has no email template');

          const result = await sendTemplateEmail({
            templateKey: topic.templateKey as any,
            toEmail: recipient.email,
            templateData: message.templateData,
          });

          await tx
            .update(schema.notificationDeliveries)
            .set({
              status: 'sent',
              provider: 'sendgrid',
              providerMessageId: result.providerMessageId,
              sentAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.notificationDeliveries.id, deliveryId));
        } else if (delivery.channel === 'in_app') {
          const title =
            topic.buildInboxTitle(message.templateData) ?? 'Notification';
          const body = topic.buildInboxBody(message.templateData) ?? '';
          const href = topic.buildHref?.(message.templateData);

          await tx.insert(schema.inAppNotifications).values({
            deliveryId: delivery.id,
            recipientId: recipient.recipientId,
            type: topic.inboxType ?? 'message_received',
            title,
            body,
            href,
            priority: message.priority,
            metadata: message.metadata,
            actorId: message.actorId,
            actorName: message.actorName,
            source: message.source ?? 'app',
          });

          await tx
            .update(schema.notificationDeliveries)
            .set({
              status: 'delivered',
              sentAt: new Date(),
              deliveredAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.notificationDeliveries.id, deliveryId));
        } else {
          // SMS not implemented
          throw new Error(`Channel ${delivery.channel} not implemented`);
        }
      } catch (error: any) {
        await tx
          .update(schema.notificationDeliveries)
          .set({
            status: 'failed',
            lastError: error.message,
            failedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.notificationDeliveries.id, deliveryId));
        throw error;
      }
    });
  }

  private async lookupRecipientProfile(
    recipientId: string,
  ): Promise<RecipientProfile | null> {
    // 1. Try finding by user_id
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, recipientId))
      .limit(1);

    if (user) {
      return {
        uid: user.id,
        email: user.email,
        phone: user.phone ?? undefined,
        displayName: user.name,
        role: undefined, // Role could be joined from roles table
      };
    }

    // 2. Try finding by patient_id
    const [patient] = await this.db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, recipientId))
      .limit(1);

    if (patient) {
      return {
        uid: patient.id,
        email: undefined, // Might need to join with users if userId exists
        phone: patient.phone ?? undefined,
        displayName: `${patient.firstName} ${patient.lastName}`,
        role: 'patient',
      };
    }

    // 3. Try finding by provider_id
    const [provider] = await this.db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, recipientId))
      .limit(1);

    if (provider) {
      return {
        uid: provider.id,
        email: undefined,
        phone: provider.phone ?? undefined,
        displayName: `${provider.firstName} ${provider.lastName}`,
        role: 'provider',
      };
    }

    return null;
  }

  async processSendGridWebhookEvents(events: Record<string, unknown>[]) {
    for (const event of events) {
      const providerEventId = this.eventIdFromWebhookPayload(event);
      const existingEvent = await this.repo.findEventByProviderEventId(
        'sendgrid',
        providerEventId,
      );
      if (existingEvent) continue;

      const deliveryId =
        typeof event.notificationDeliveryId === 'string'
          ? event.notificationDeliveryId
          : undefined;
      const providerMessageId =
        typeof event.sg_message_id === 'string'
          ? event.sg_message_id
          : undefined;

      const matchedDelivery = deliveryId
        ? await this.repo.findDeliveryById(deliveryId)
        : providerMessageId
          ? await this.repo.findDeliveryByProviderId(
              'sendgrid',
              providerMessageId,
            )
          : null;

      const eventType = (event.event as string) ?? 'unknown';
      const occurredAt =
        typeof event.timestamp === 'number'
          ? new Date(event.timestamp * 1000)
          : new Date();

      await this.repo.logEvent({
        deliveryId: matchedDelivery?.id ?? null,
        provider: 'sendgrid',
        eventType,
        providerEventId,
        providerMessageId: providerMessageId ?? null,
        providerRecipientEmail: (event.email as string) ?? null,
        payload: event,
        occurredAt,
        processedAt: new Date(),
      });

      if (!matchedDelivery) continue;

      if (eventType === 'delivered') {
        await this.repo.updateDelivery(matchedDelivery.id, {
          status: 'delivered',
          deliveredAt: occurredAt,
        });
      } else if (eventType === 'bounce' || eventType === 'dropped') {
        await this.repo.updateDelivery(matchedDelivery.id, {
          status: 'bounced',
          failedAt: occurredAt,
          lastError: (event.reason as string) ?? eventType,
        });
      } else if (eventType === 'deferred') {
        await this.repo.updateDelivery(matchedDelivery.id, {
          status: 'retry_scheduled',
          lastError: (event.response as string) ?? eventType,
        });
      } else if (eventType === 'processed') {
        await this.repo.updateDelivery(matchedDelivery.id, {
          status: 'sent',
          sentAt: occurredAt,
        });
      }
    }
  }

  private eventIdFromWebhookPayload(payload: Record<string, unknown>): string {
    const id = payload.sg_event_id;
    if (typeof id === 'string') return id;
    const basis = [
      String(payload.sg_message_id ?? ''),
      String(payload.event ?? ''),
      String(payload.timestamp ?? ''),
    ].join('|');
    return createHash('sha256').update(basis).digest('hex');
  }
}
