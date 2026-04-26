import { Router } from 'express';
import { z } from 'zod';
import { notificationService, sendDirectTemplateEmail } from '../modules/notifications';
import type { NotificationChannel, NotificationTemplateKey, NotificationTopicKey } from '../modules/notifications';

const router = Router();

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

export default router;
