import { CloudTasksClient } from '@google-cloud/tasks';
import { logger } from '../../utils/logger';
import type { DispatchTaskPayload } from './types';

const tasksClient = new CloudTasksClient();

interface QueueConfig {
    projectId: string;
    location: string;
    queue: string;
    targetUrl: string;
    secret: string | null;
}

function getQueueConfig(): QueueConfig | null {
    const projectId = process.env.NOTIFICATION_TASKS_PROJECT_ID?.trim();
    const location = process.env.NOTIFICATION_TASKS_LOCATION?.trim();
    const queue = process.env.NOTIFICATION_TASKS_QUEUE?.trim();
    const targetUrl = process.env.NOTIFICATION_TASKS_TARGET_URL?.trim();

    if (!projectId || !location || !queue || !targetUrl) {
        return null;
    }

    return {
        projectId,
        location,
        queue,
        targetUrl,
        secret: process.env.NOTIFICATION_TASKS_SECRET?.trim() || null,
    };
}

export function canUseInlineFallback(): boolean {
    return process.env.NODE_ENV !== 'production';
}

export async function enqueueDispatchTask(
    payload: DispatchTaskPayload,
    options: { scheduleAt?: Date | null; onInlineDispatch?: () => Promise<void> },
): Promise<{ taskName: string | null }> {
    const queueConfig = getQueueConfig();

    if (!queueConfig) {
        if (!options.onInlineDispatch || !canUseInlineFallback()) {
            throw new Error('Notification Cloud Tasks configuration is incomplete.');
        }

        const inlineDispatch = options.onInlineDispatch;
        const delayMs = options.scheduleAt ? Math.max(options.scheduleAt.getTime() - Date.now(), 0) : 0;
        setTimeout(() => {
            void inlineDispatch().catch((error) => {
                logger.error('Inline notification dispatch failed', {
                    deliveryId: payload.deliveryId,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        }, delayMs);

        return {
            taskName: null,
        };
    }

    const parent = tasksClient.queuePath(queueConfig.projectId, queueConfig.location, queueConfig.queue);
    const task: {
        httpRequest: {
            httpMethod: 'POST';
            url: string;
            headers: Record<string, string>;
            body: string;
        };
        scheduleTime?: { seconds: number };
    } = {
        httpRequest: {
            httpMethod: 'POST',
            url: queueConfig.targetUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            body: Buffer.from(JSON.stringify(payload)).toString('base64'),
        },
    };

    if (queueConfig.secret) {
        task.httpRequest.headers['X-Notification-Task-Secret'] = queueConfig.secret;
    }

    if (options.scheduleAt) {
        task.scheduleTime = {
            seconds: Math.floor(options.scheduleAt.getTime() / 1000),
        };
    }

    const [response] = await tasksClient.createTask({
        parent,
        task,
    });

    return {
        taskName: response.name ?? null,
    };
}

export async function deleteDispatchTask(taskName: string): Promise<void> {
    await tasksClient.deleteTask({ name: taskName });
}

export function verifyDispatchSecret(secret: string | undefined): boolean {
    const configuredSecret = process.env.NOTIFICATION_TASKS_SECRET?.trim();
    if (!configuredSecret) {
        return canUseInlineFallback();
    }

    return secret === configuredSecret;
}
