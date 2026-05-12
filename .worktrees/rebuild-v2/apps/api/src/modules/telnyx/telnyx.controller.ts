import { Elysia } from 'elysia';
import { db } from '../../db';
import { notificationRepository } from '@workspace/db/index';

const repository = notificationRepository(db);

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;

const mapDeliveryStatus = (
  eventType: string,
  payload: Record<string, unknown>,
): 'sent' | 'delivered' | 'failed' | 'bounced' | undefined => {
  const normalized = eventType.toLowerCase();
  const recipientStatus =
    Array.isArray(payload.to) && payload.to.length > 0
      ? asString(asRecord(payload.to[0]).status)
      : undefined;

  if (normalized.includes('delivered') || recipientStatus === 'delivered') {
    return 'delivered';
  }
  if (normalized.includes('sent') || recipientStatus === 'sent') {
    return 'sent';
  }
  if (
    normalized.includes('delivery_failed') ||
    recipientStatus === 'delivery_failed'
  ) {
    return 'failed';
  }
  if (normalized.includes('undelivered') || recipientStatus === 'undelivered') {
    return 'bounced';
  }

  return undefined;
};

export const telnyxController = new Elysia({ prefix: '/v1/telnyx' }).post(
  '/webhook',
  async ({ request, set }) => {
    try {
      const body = await request.json().catch(() => ({}));
      const event = asRecord(asRecord(body).data ?? body);
      const payload = asRecord(event.payload ?? event);
      const eventType =
        asString(event.event_type) ??
        asString(payload.event_type) ??
        'telnyx.unknown';
      const providerEventId =
        asString(event.id) ?? asString(payload.id) ?? `${eventType}:${Date.now()}`;
      const providerMessageId = asString(payload.id);

      let deliveryId: string | undefined;
      if (providerMessageId) {
        const delivery = await repository.findDeliveryByProviderId(
          'telnyx',
          providerMessageId,
        );
        deliveryId = delivery?.id;

        const nextStatus = mapDeliveryStatus(eventType, payload);
        if (delivery && nextStatus) {
          await repository.updateDelivery(delivery.id, {
            status: nextStatus,
            deliveredAt:
              nextStatus === 'delivered' ? new Date() : delivery.deliveredAt,
            failedAt:
              nextStatus === 'failed' || nextStatus === 'bounced'
                ? new Date()
                : delivery.failedAt,
            lastError:
              nextStatus === 'failed' || nextStatus === 'bounced'
                ? asString(payload.errors) ??
                  asString(payload.delivery_status) ??
                  delivery.lastError
                : undefined,
            providerResponseCode:
              asString(payload.delivery_status) ?? delivery.providerResponseCode,
          });
        }
      }

      await repository.logEvent({
        deliveryId,
        provider: 'telnyx',
        eventType,
        providerEventId,
        providerMessageId,
        payload,
        occurredAt: new Date(),
        processedAt: new Date(),
      });

      set.status = 202;
      return { success: true };
    } catch (error) {
      set.status = 500;
      return {
        error: error instanceof Error ? error.message : 'Telnyx webhook failed.',
      };
    }
  },
  {
    detail: {
      summary: 'Telnyx Webhook Handler',
      tags: ['Telnyx'],
    },
  },
);
