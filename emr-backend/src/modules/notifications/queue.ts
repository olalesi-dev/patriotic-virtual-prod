import { CloudTasksClient } from '@google-cloud/tasks';
import { logger } from '../../utils/logger';
import type { DispatchTaskPayload } from './types';

let tasksClient: CloudTasksClient | null = null;

interface QueueConfig {
    projectId: string;
    location: string;
    queue: string;
    targetUrl: string;
    secret: string | null;
}

function normalizePrivateKey(value: string): string {
    return value.replace(/\\n/g, '\n');
}

function readCloudTasksClientOptions(projectId?: string): ConstructorParameters<typeof CloudTasksClient>[0] {
    const jsonCandidates = [
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    ];

    for (const rawJson of jsonCandidates) {
        if (!rawJson) continue;

        const rawCandidates = [rawJson];
        try {
            rawCandidates.push(Buffer.from(rawJson, 'base64').toString('utf8'));
        } catch {
            // Ignore invalid base64 and try the raw value.
        }

        for (const candidate of rawCandidates) {
            try {
                const parsed = JSON.parse(candidate) as {
                    project_id?: string;
                    client_email?: string;
                    private_key?: string;
                };

                if (parsed.client_email && parsed.private_key) {
                    return {
                        projectId: parsed.project_id ?? projectId,
                        credentials: {
                            client_email: parsed.client_email,
                            private_key: normalizePrivateKey(parsed.private_key),
                        },
                    };
                }
            } catch {
                // Continue to the next credential shape.
            }
        }
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (clientEmail && privateKey) {
        return {
            projectId: process.env.FIREBASE_PROJECT_ID ?? projectId,
            credentials: {
                client_email: clientEmail,
                private_key: normalizePrivateKey(privateKey),
            },
        };
    }

    return projectId ? { projectId } : undefined;
}

function getTasksClient(projectId?: string): CloudTasksClient {
    if (!tasksClient) {
        tasksClient = new CloudTasksClient(readCloudTasksClientOptions(projectId));
    }

    return tasksClient;
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
        const isImmediateDispatch = !options.scheduleAt || options.scheduleAt.getTime() <= Date.now();

        if (!options.onInlineDispatch || (!isImmediateDispatch && !canUseInlineFallback())) {
            throw new Error('Notification Cloud Tasks configuration is incomplete.');
        }

        const inlineDispatch = options.onInlineDispatch;
        if (isImmediateDispatch) {
            await inlineDispatch();
            return {
                taskName: null,
            };
        }

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

    const client = getTasksClient(queueConfig.projectId);
    const parent = client.queuePath(queueConfig.projectId, queueConfig.location, queueConfig.queue);
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

    const [response] = await client.createTask({
        parent,
        task,
    });

    return {
        taskName: response.name ?? null,
    };
}

export async function deleteDispatchTask(taskName: string): Promise<void> {
    const queueConfig = getQueueConfig();
    await getTasksClient(queueConfig?.projectId).deleteTask({ name: taskName });
}

export function verifyDispatchSecret(secret: string | undefined): boolean {
    const configuredSecret = process.env.NOTIFICATION_TASKS_SECRET?.trim();
    if (!configuredSecret) {
        return canUseInlineFallback();
    }

    return secret === configuredSecret;
}
