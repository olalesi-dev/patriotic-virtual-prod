import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { NotificationQueue } from '@workspace/queue';
import {
  NotificationService,
  getSendGridWebhookSignatureHeaders,
  verifySendGridWebhookSignature,
  isSendGridWebhookVerificationEnabled,
  type DispatchTaskPayload,
  NotificationProducers,
} from '@workspace/notifications';

const queue = new NotificationQueue();
const notificationService = new NotificationService(db, queue);
const producers = new NotificationProducers(db, notificationService);

// Register worker - in production this might be a separate process
if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
  queue.registerWorker(async (payload: DispatchTaskPayload) => {
    await notificationService.processDelivery(payload.deliveryId);
  });
}

export const notificationController = new Elysia({
  prefix: '/notifications',
})
  .post(
    '/notify',
    async ({ body }) => {
      return await notificationService.notify(body as any);
    },
    {
      body: t.Object({
        topicKey: t.String(),
        entityId: t.String(),
        recipientIds: t.Array(t.String()),
        templateData: t.Record(t.String(), t.Any()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
        dedupeKey: t.Optional(t.String()),
        channels: t.Optional(t.Array(t.String())),
        actorId: t.Optional(t.String()),
        actorName: t.Optional(t.String()),
        source: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/appointment-bucket-alert',
    async ({ body }) => {
      const { patientName, service, appointmentId } = body;

      await producers.notifyPriorityQueuePaymentSuccess({
        appointmentId: appointmentId || `priority-${Date.now()}`,
        patientName,
        serviceName: service || 'Consultation',
        requestedAt: new Date(),
      });

      return {
        success: true,
        message: 'Priority queue notifications enqueued.',
      };
    },
    {
      body: t.Object({
        patientName: t.String(),
        service: t.Optional(t.String()),
        appointmentId: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Send Appointment Bucket Alert',
        tags: ['Notifications'],
      },
    },
  )
  .post('/sendgrid/webhook', async ({ request, headers, set }) => {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    if (isSendGridWebhookVerificationEnabled()) {
      const { signature, timestamp } = getSendGridWebhookSignatureHeaders(
        headers as Record<string, unknown>,
      );

      const verified = verifySendGridWebhookSignature({
        payload: Buffer.from(rawBody, 'utf8'),
        signatureHeader: signature,
        timestampHeader: timestamp,
      });

      if (!verified) {
        set.status = 401;
        return { success: false, error: 'Invalid SendGrid webhook signature' };
      }
    }

    const events = Array.isArray(payload) ? payload : [];
    await notificationService.processSendGridWebhookEvents(events);

    set.status = 202;
    return { success: true, processed: events.length };
  });
