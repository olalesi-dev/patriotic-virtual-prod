import { Elysia, t } from 'elysia';
import { db } from '../../../db';
import { DoseSpotWebhookService } from '../webhook.service';
import {
  NotificationProducers,
  NotificationService,
} from '@workspace/notifications/index';
import { NotificationQueue } from '@workspace/queue/index';

const queue = new NotificationQueue();
const notificationService = new NotificationService(db, queue);
const producers = new NotificationProducers(db, notificationService);
const webhookService = new DoseSpotWebhookService(db, producers);

export const webhookController = new Elysia({ prefix: '/webhooks' }).post(
  '/',
  async ({ body, headers, set }) => {
    const authHeader = headers['authorization'];
    if (!webhookService.verifySignature(authHeader)) {
      set.status = 401;
      return { error: 'Invalid DoseSpot webhook secret' };
    }

    const result = await webhookService.ingestWebhook(
      body as Record<string, any>,
      headers as any,
    );

    setImmediate(() => {
      void webhookService.processEvent(result.id).catch((err) => {
        console.error(`DoseSpot webhook processing failed: ${result.id}`, err);
      });
    });

    set.status = 202;
    return { success: true, eventId: result.id };
  },
  {
    detail: { summary: 'DoseSpot Inbound Webhook', tags: ['DoseSpot'] },
  },
);
