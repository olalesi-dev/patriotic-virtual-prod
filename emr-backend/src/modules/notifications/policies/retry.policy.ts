import type { NotificationPriority } from '../types';

const BACKOFF_BY_PRIORITY: Record<NotificationPriority, number[]> = {
    critical: [15, 60, 300],
    high: [60, 300, 900],
    medium: [300, 900, 1800],
    low: [900, 1800, 3600],
};

export function getRetryDelaySeconds(priority: NotificationPriority, attemptCount: number): number | null {
    const delays = BACKOFF_BY_PRIORITY[priority];
    return delays[attemptCount] ?? null;
}

