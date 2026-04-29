import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { vouchedController } from './vouched.controller';

describe('vouchedController', () => {
  it('rejects unsigned webhook requests before parsing payloads', async () => {
    const app = new Elysia().use(vouchedController);
    const response = await app.handle(
      new Request('http://localhost/v1/vouched/webhook', {
        body: JSON.stringify({ id: 'job_123', status: 'completed' }),
        method: 'POST',
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Invalid signature',
      success: false,
    });
    expect(response.status).toBe(401);
  });
});
