import { Router } from 'express';
import { NotificationRepository } from '../modules/notifications/repository';
import { logger } from '../utils/logger';

const router = Router();
const repository = new NotificationRepository();

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function mapDeliveryStatus(eventType: string, payload: Record<string, unknown>): 'sent' | 'delivered' | 'failed' | 'bounced' | null {
    const normalized = eventType.toLowerCase();
    const recipientStatus = Array.isArray(payload.to) && payload.to.length > 0
        ? asString(asRecord(payload.to[0]).status)
        : null;

    if (normalized.includes('delivered') || recipientStatus === 'delivered') return 'delivered';
    if (normalized.includes('sent') || recipientStatus === 'sent') return 'sent';
    if (normalized.includes('delivery_failed') || recipientStatus === 'delivery_failed') return 'failed';
    if (normalized.includes('undelivered') || recipientStatus === 'undelivered') return 'bounced';
    return null;
}

router.post('/webhook', async (req, res) => {
    try {
        const event = asRecord(req.body?.data ?? req.body);
        const payload = asRecord(event.payload ?? event);
        const eventType = asString(event.event_type) ?? asString(payload.event_type) ?? 'telnyx.unknown';
        const providerEventId = asString(event.id) ?? asString(payload.id) ?? `${eventType}:${Date.now()}`;
        const providerMessageId = asString(payload.id);

        let deliveryId: string | null = null;
        if (providerMessageId) {
            const delivery = await repository.findDeliveryByProviderMessageId(providerMessageId);
            deliveryId = delivery?.id ?? null;

            const nextStatus = mapDeliveryStatus(eventType, payload);
            if (delivery && nextStatus) {
                await repository.updateDelivery(delivery.id, {
                    status: nextStatus,
                    deliveredAt: nextStatus === 'delivered' ? new Date() : delivery.deliveredAt,
                    failedAt: nextStatus === 'failed' || nextStatus === 'bounced' ? new Date() : delivery.failedAt,
                    lastError: nextStatus === 'failed' || nextStatus === 'bounced'
                        ? asString(payload?.errors) ?? asString(payload?.delivery_status) ?? delivery.lastError
                        : null,
                    providerResponseCode: asString(payload?.delivery_status) ?? delivery.providerResponseCode,
                });
            }
        }

        await repository.recordEvent({
            deliveryId,
            provider: 'telnyx',
            eventType,
            providerEventId,
            providerMessageId,
            payload,
            occurredAt: new Date(),
            processedAt: new Date(),
        });

        logger.info('Processed Telnyx webhook event', {
            eventType,
            providerEventId,
            providerMessageId,
            deliveryId,
        });

        return res.status(202).json({ success: true });
    } catch (error) {
        logger.error('Telnyx webhook processing failed', {
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Telnyx webhook failed.' });
    }
});

export default router;
