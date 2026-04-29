import type { NotificationPriority } from '../types';

const backoffByPriority: Record<NotificationPriority, number[]> = {
  critical: [15, 60, 300],
  high: [60, 300, 900],
  low: [900, 1800, 3600],
  medium: [300, 900, 1800],
};

export const getRetryDelaySeconds = (
  priority: NotificationPriority,
  attemptCount: number,
): number | undefined => backoffByPriority[priority][attemptCount];
