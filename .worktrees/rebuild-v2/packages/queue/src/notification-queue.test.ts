import { describe, expect, it } from 'bun:test';
import {
  NotificationQueue,
  buildJobOptions,
  shouldUseInlineFallback,
} from './notification-queue';

describe('notification queue', () => {
  it('builds delayed BullMQ job options', () => {
    expect(
      buildJobOptions(
        {
          jobId: 'delivery-1',
          scheduleAt: new Date('2026-04-28T10:01:00.000Z'),
        },
        Date.parse('2026-04-28T10:00:00.000Z'),
      ),
    ).toMatchObject({
      attempts: 5,
      delay: 60_000,
      jobId: 'delivery-1',
    });
  });

  it('never creates negative delays', () => {
    expect(
      buildJobOptions(
        {
          scheduleAt: new Date('2026-04-28T09:59:00.000Z'),
        },
        Date.parse('2026-04-28T10:00:00.000Z'),
      ).delay,
    ).toBe(0);
  });

  it('uses inline fallback outside production by default', () => {
    expect(shouldUseInlineFallback()).toBe(true);
    expect(shouldUseInlineFallback({ inlineFallback: false })).toBe(false);
  });

  it('runs inline fallback with the computed delay', async () => {
    let timerDelay = -1;
    let dispatched = false;
    const queue = new NotificationQueue({
      redisUrl: undefined,
      inlineFallback: true,
      now: () => Date.parse('2026-04-28T10:00:00.000Z'),
      setTimer(handler, delayMs) {
        timerDelay = delayMs;
        handler();
      },
    });

    const result = await queue.enqueue(
      { deliveryId: 'delivery-1' },
      {
        scheduleAt: new Date('2026-04-28T10:00:30.000Z'),
        onInlineDispatch: async () => {
          dispatched = true;
        },
      },
    );

    expect(result).toEqual({ mode: 'inline_fallback' });
    expect(timerDelay).toBe(30_000);
    expect(dispatched).toBe(true);
  });

  it('requires Redis when inline fallback is disabled', async () => {
    const queue = new NotificationQueue({
      redisUrl: undefined,
      inlineFallback: false,
    });

    await expect(queue.enqueue({ deliveryId: 'delivery-1' })).rejects.toThrow(
      'REDIS_URL is required',
    );
  });
});
