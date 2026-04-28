import { Elysia } from 'elysia';
import { extractVouchedCorrelation, verifyVouchedSignature } from './helpers';
import { vouchedModel } from './model';
import { parseVouchedWebhookBody } from './parser';
import { fetchVouchedJob, processVouchedJob } from './service';

export const vouchedController = new Elysia({ prefix: '/v1/vouched' })
  .use(vouchedModel)
  .post(
    '/webhook',
    async ({ request, headers, set }) => {
      const signature = headers['x-signature'];
      const rawBody = await request.text();

      if (!verifyVouchedSignature(rawBody, signature)) {
        set.status = 401;
        return { success: false, error: 'Invalid signature' };
      }

      try {
        const webhookPayload = parseVouchedWebhookBody(rawBody);
        const job = await fetchVouchedJob(webhookPayload.id);
        const correlation = extractVouchedCorrelation(job);

        if (!correlation.patientId) {
          set.status = 202;
          return {
            accepted: true,
            jobId: job.id,
            matched: false,
          };
        }

        const verification = await processVouchedJob(job);
        return {
          success: true,
          data: {
            id: verification.id,
            status: verification.status,
            verified: verification.status === 'verified',
          },
        };
      } catch (error) {
        const { message } = error as Error;
        set.status = message.includes('payload') ? 400 : 500;
        return { success: false, error: message };
      }
    },
    {
      detail: {
        summary: 'Vouched Webhook Handler',
        tags: ['Vouched'],
      },
    },
  );
