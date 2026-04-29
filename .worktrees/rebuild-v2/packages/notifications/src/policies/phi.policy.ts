import type { NotificationChannel } from '../types';

export const assertChannelAllowedForTopic = (
  channel: NotificationChannel,
  containsPHI: boolean,
): void => {
  if (channel === 'sms' && containsPHI) {
    throw new Error('SMS delivery is blocked for PHI-bearing topics.');
  }
};
