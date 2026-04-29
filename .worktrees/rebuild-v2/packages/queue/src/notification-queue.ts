import { Queue, Worker, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

export interface NotificationJobPayload {
  deliveryId: string;
}

export interface EnqueueNotificationOptions {
  jobId?: string;
  scheduleAt?: Date;
  onInlineDispatch?: () => Promise<void>;
}

export interface EnqueueNotificationResult {
  mode: 'bullmq' | 'inline_fallback';
  jobId?: string;
}

export interface NotificationQueueOptions {
  redisUrl?: string;
  queueName?: string;
  inlineFallback?: boolean;
  now?: () => number;
  setTimer?: (handler: () => void, delayMs: number) => unknown;
}

export type NotificationJobProcessor = (
  payload: NotificationJobPayload,
) => Promise<void>;

const defaultQueueName = 'notifications';
const bullMqNoRetryLimit = JSON.parse('null') as null;

export const shouldUseInlineFallback = (
  options: Pick<NotificationQueueOptions, 'inlineFallback'> = {},
): boolean => {
  if (typeof options.inlineFallback === 'boolean') {
    return options.inlineFallback;
  }

  if (process.env.QUEUE_INLINE_FALLBACK?.trim() === 'true') {
    return true;
  }

  return process.env.NODE_ENV !== 'production';
};

export const buildJobOptions = (
  options: EnqueueNotificationOptions,
  now = Date.now(),
): JobsOptions => {
  const jobOptions: JobsOptions = {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 30_000,
    },
    removeOnComplete: 1000,
    removeOnFail: false,
  };

  if (options.jobId) {
    jobOptions.jobId = options.jobId;
  }

  if (options.scheduleAt) {
    jobOptions.delay = Math.max(options.scheduleAt.getTime() - now, 0);
  }

  return jobOptions;
};

export class NotificationQueue {
  private readonly redisUrl?: string;
  private readonly queueName: string;
  private readonly inlineFallback: boolean;
  private readonly now: () => number;
  private readonly setTimer: (handler: () => void, delayMs: number) => unknown;
  private queue?: Queue<NotificationJobPayload>;

  constructor(options: NotificationQueueOptions = {}) {
    this.redisUrl = options.redisUrl ?? process.env.REDIS_URL?.trim();
    this.queueName =
      options.queueName ??
      process.env.NOTIFICATION_QUEUE_NAME?.trim() ??
      defaultQueueName;
    this.inlineFallback = shouldUseInlineFallback(options);
    this.now = options.now ?? Date.now;
    this.setTimer = options.setTimer ?? setTimeout;
  }

  async enqueue(
    payload: NotificationJobPayload,
    options: EnqueueNotificationOptions = {},
  ): Promise<EnqueueNotificationResult> {
    if (!this.redisUrl) {
      if (!this.inlineFallback || !options.onInlineDispatch) {
        throw new Error('REDIS_URL is required for notification queueing.');
      }

      const delayMs = options.scheduleAt
        ? Math.max(options.scheduleAt.getTime() - this.now(), 0)
        : 0;

      this.setTimer(() => {
        void options.onInlineDispatch?.();
      }, delayMs);

      return {
        mode: 'inline_fallback',
      };
    }

    const job = await this.getQueue().add(
      'dispatch-notification',
      payload,
      buildJobOptions(options, this.now()),
    );

    return {
      mode: 'bullmq',
      jobId: job.id,
    };
  }

  async cancel(jobId: string): Promise<void> {
    const job = await this.getQueue().getJob(jobId);
    await job?.remove();
  }

  registerWorker(processor: NotificationJobProcessor): Worker {
    if (!this.redisUrl) {
      throw new Error('REDIS_URL is required to start notification workers.');
    }

    return new Worker<NotificationJobPayload>(
      this.queueName,
      async (job) => {
        await processor(job.data);
      },
      {
        connection: new IORedis(this.redisUrl, {
          maxRetriesPerRequest: bullMqNoRetryLimit,
        }),
      },
    );
  }

  async close(): Promise<void> {
    await this.queue?.close();
  }

  private getQueue(): Queue<NotificationJobPayload> {
    if (!this.redisUrl) {
      throw new Error('REDIS_URL is required for notification queueing.');
    }

    this.queue ??= new Queue<NotificationJobPayload>(this.queueName, {
      connection: new IORedis(this.redisUrl, {
        maxRetriesPerRequest: bullMqNoRetryLimit,
      }),
    });

    return this.queue;
  }
}
