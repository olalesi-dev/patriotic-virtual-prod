import { Elysia } from 'elysia';
import { vouchedModel } from './model';
import { verifyVouchedSignature, processVouchedJob } from './service';

export const vouchedController = new Elysia({ prefix: '/v1/vouched' })
  .use(vouchedModel)
  .post(
    '/webhook',
    async ({ request, body, headers, set }) => {
      const signature = headers['x-signature'];
      if (!signature) {
        set.status = 401;
        return { success: false, error: 'Missing signature' };
      }

      // Clone request to get raw body for signature verification
      const rawBody = await request.clone().text();

      if (!verifyVouchedSignature(rawBody, signature)) {
        set.status = 401;
        return { success: false, error: 'Invalid signature' };
      }

      try {
        await processVouchedJob(body);
        return { success: true };
      } catch (error) {
        const message = (error as Error).message;
        set.status = 400;
        return { success: false, error: message };
      }
    },
    {
      body: 'vouchedPayload',
      detail: {
        summary: 'Vouched Webhook Handler',
        tags: ['Vouched']
      }
    }
  );
