import { createHash } from 'node:crypto';
import type { NotificationTopicKey } from '../types';

export interface BuildNotificationDedupeKeyInput {
  topicKey: NotificationTopicKey;
  entityId: string;
  recipientIds: string[];
  channels: string[];
  customKey?: string;
}

const normalizePart = (value: string): string => value.trim().toLowerCase();

export const buildNotificationDedupeKey = (
  input: BuildNotificationDedupeKeyInput,
): string => {
  if (input.customKey?.trim()) {
    return input.customKey.trim();
  }

  const basis = [
    input.topicKey,
    normalizePart(input.entityId),
    [...input.recipientIds].map(normalizePart).sort().join(','),
    [...input.channels].map(normalizePart).sort().join(','),
  ].join('|');

  return createHash('sha256').update(basis).digest('hex');
};
