import { Router } from 'express';
import { z } from 'zod';
import { dispatchNotificationDelivery, processSendGridWebhookEvents } from '../modules/notifications';
import { verifyDispatchSecret } from '../modules/notifications/queue';
import {
    getSendGridWebhookSignatureHeaders,
    isSendGridWebhookVerificationEnabled,
    verifySendGridWebhookSignature,
} from '../modules/notifications/sendgrid-webhook-security';
import { logger } from '../utils/logger';

const router = Router();

const taskPayloadSchema = z.object({
    deliveryId: z.string().trim().min(1),
});

router.post('/tasks/dispatch', async (req, res) => {
    const secret = req.get('X-Notification-Task-Secret') ?? undefined;
    if (!verifyDispatchSecret(secret)) {
        return res.status(401).json({ error: 'Unauthorized notification task request.' });
    }

    try {
        const parsed = taskPayloadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid task payload.' });
        }

        await dispatchNotificationDelivery(parsed.data.deliveryId);
        return res.status(202).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Dispatch failed.' });
    }
});

router.post('/sendgrid/webhook', async (req, res) => {
    try {
        const rawPayload = req.rawBodyBuffer ?? Buffer.from(req.rawBody ?? '', 'utf8');
        if (isSendGridWebhookVerificationEnabled()) {
            const { signature, timestamp } = getSendGridWebhookSignatureHeaders(req.headers as Record<string, unknown>);
            const verified = verifySendGridWebhookSignature({
                payload: rawPayload,
                signatureHeader: signature,
                timestampHeader: timestamp,
            });

            if (!verified) {
                logger.warn('Rejected SendGrid webhook due to invalid signature', {
                    hasSignature: Boolean(signature),
                    hasTimestamp: Boolean(timestamp),
                    contentLength: rawPayload.byteLength,
                });
                return res.status(401).json({ error: 'Invalid SendGrid webhook signature.' });
            }

            logger.info('Verified SendGrid webhook signature', {
                contentLength: rawPayload.byteLength,
            });
        }

        const payload = Array.isArray(req.body)
            ? req.body.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
            : [];

        await processSendGridWebhookEvents(payload);
        return res.status(202).json({ success: true, processed: payload.length });
    } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Webhook processing failed.' });
    }
});

export default router;
