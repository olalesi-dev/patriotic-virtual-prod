import { Router } from 'express';
import { z } from 'zod';
import { notificationService, sendDirectTemplateEmail } from '../modules/notifications';
import { NotificationRepository } from '../modules/notifications/repository';
import type { NotificationChannel, NotificationTemplateKey, NotificationTopicKey } from '../modules/notifications';

const router = Router();
const repository = new NotificationRepository();

const scheduleSchema = z.object({
    topicKey: z.string().trim().min(1),
    entityId: z.string().trim().min(1),
    dedupeKey: z.string().trim().min(1),
    sendAt: z.string().datetime(),
    recipientIds: z.array(z.string().trim().min(1)).min(1).optional(),
    channels: z.array(z.enum(['email', 'sms', 'in_app'])).optional(),
    templateData: z.record(z.string(), z.unknown()).default({}),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

const notifySchema = z.object({
    topicKey: z.string().trim().min(1),
    entityId: z.string().trim().min(1),
    recipientIds: z.array(z.string().trim().min(1)).min(1),
    templateData: z.record(z.string(), z.unknown()).default({}),
    metadata: z.record(z.string(), z.unknown()).optional(),
    dedupeKey: z.string().trim().min(1).optional(),
    channels: z.array(z.enum(['email', 'sms', 'in_app'])).optional(),
    actorId: z.string().trim().min(1).optional(),
    actorName: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).optional(),
    cancelDedupeKeys: z.array(z.string().trim().min(1)).optional(),
    followUpSchedules: z.array(scheduleSchema).optional(),
});

const directTemplateEmailSchema = z.object({
    templateKey: z.string().trim().min(1),
    toEmail: z.string().trim().email(),
    templateData: z.record(z.string(), z.unknown()).default({}),
});

const deliveryStatusQuerySchema = z.object({
    email: z.string().trim().email().optional(),
    providerMessageId: z.union([z.string(), z.array(z.string())]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
}).refine((value) => Boolean(value.email || value.providerMessageId), {
    message: 'Either email or providerMessageId is required.',
});

router.post('/notify', async (req, res) => {
    try {
        const parsed = notifySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid notification payload.' });
        }

        const body = parsed.data;
        for (const dedupeKey of body.cancelDedupeKeys ?? []) {
            await notificationService.cancelScheduledByDedupeKey(dedupeKey);
        }

        const result = await notificationService.notify({
            topicKey: body.topicKey as NotificationTopicKey,
            entityId: body.entityId,
            recipientIds: body.recipientIds,
            templateData: body.templateData,
            metadata: body.metadata,
            dedupeKey: body.dedupeKey,
            channels: body.channels as NotificationChannel[] | undefined,
            actorId: body.actorId ?? req.user?.uid ?? null,
            actorName: body.actorName ?? null,
            source: body.source ?? null,
        });

        const followUps = [];
        for (const followUp of body.followUpSchedules ?? []) {
            const sendAt = new Date(followUp.sendAt);
            if (Number.isNaN(sendAt.getTime()) || sendAt <= new Date()) {
                continue;
            }

            const followUpResult = await notificationService.schedule({
                topicKey: followUp.topicKey as NotificationTopicKey,
                entityId: followUp.entityId,
                recipientIds: followUp.recipientIds ?? body.recipientIds,
                templateData: followUp.templateData,
                metadata: followUp.metadata,
                dedupeKey: followUp.dedupeKey,
                channels: followUp.channels as NotificationChannel[] | undefined,
                actorId: body.actorId ?? req.user?.uid ?? null,
                actorName: body.actorName ?? null,
                source: body.source ?? null,
                sendAt,
            });
            followUps.push(followUpResult);
        }

        return res.json({
            success: true,
            result,
            followUps,
        });
    } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create notification.' });
    }
});

router.post('/send-template-email', async (req, res) => {
    try {
        const parsed = directTemplateEmailSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid email payload.' });
        }

        await sendDirectTemplateEmail({
            templateKey: parsed.data.templateKey as NotificationTemplateKey,
            toEmail: parsed.data.toEmail,
            templateData: parsed.data.templateData,
            customArgs: {
                actorUid: req.user?.uid ?? 'unknown',
                templateKey: parsed.data.templateKey,
            },
        });

        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send template email.' });
    }
});

router.get('/delivery-status', async (req, res) => {
    try {
        const parsed = deliveryStatusQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid delivery status query.' });
        }

        const providerMessageIds = Array.isArray(parsed.data.providerMessageId)
            ? parsed.data.providerMessageId
            : parsed.data.providerMessageId
                ? [parsed.data.providerMessageId]
                : [];

        const [eventsByEmail, eventsByMessageId, recipient] = await Promise.all([
            parsed.data.email ? repository.listRecentEventsByEmail(parsed.data.email, parsed.data.limit) : Promise.resolve([]),
            providerMessageIds.length > 0 ? repository.listRecentEventsByProviderMessageIds(providerMessageIds, parsed.data.limit) : Promise.resolve([]),
            parsed.data.email ? repository.findRecipientByEmail(parsed.data.email) : Promise.resolve(null),
        ]);

        const deliveries = recipient
            ? await repository.listRecentDeliveriesByRecipientId(recipient.uid, parsed.data.limit)
            : [];

        const events = [...eventsByEmail, ...eventsByMessageId]
            .filter((event, index, array) => array.findIndex((candidate) => candidate.id === event.id) === index)
            .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
            .slice(0, parsed.data.limit);

        const latestEventByMessageId = Object.fromEntries(
            events
                .filter((event) => event.providerMessageId)
                .map((event) => [event.providerMessageId as string, event])
        );

        return res.json({
            success: true,
            email: parsed.data.email ?? null,
            recipient: recipient ? {
                uid: recipient.uid,
                email: recipient.email,
                displayName: recipient.displayName,
                role: recipient.role,
            } : null,
            deliveries: deliveries.map((delivery) => ({
                id: delivery.id,
                topicKey: delivery.topicKey,
                channel: delivery.channel,
                status: delivery.status,
                provider: delivery.provider,
                providerMessageId: delivery.providerMessageId,
                providerResponseCode: delivery.providerResponseCode,
                sentAt: delivery.sentAt?.toISOString() ?? null,
                deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
                failedAt: delivery.failedAt?.toISOString() ?? null,
                lastError: delivery.lastError,
                latestEvent: delivery.providerMessageId ? latestEventByMessageId[delivery.providerMessageId] ?? null : null,
            })),
            events: events.map((event) => ({
                id: event.id,
                deliveryId: event.deliveryId,
                eventType: event.eventType,
                providerMessageId: event.providerMessageId,
                occurredAt: event.occurredAt.toISOString(),
                processedAt: event.processedAt.toISOString(),
                reason: typeof event.payload.reason === 'string' ? event.payload.reason : null,
                response: typeof event.payload.response === 'string' ? event.payload.response : null,
                email: typeof event.payload.email === 'string' ? event.payload.email : null,
            })),
        });
    } catch (error) {
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch delivery status.' });
    }
});

export default router;
