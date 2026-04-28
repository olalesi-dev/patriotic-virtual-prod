import { describe, expect, test } from 'bun:test';
import {
  inAppNotifications,
  notificationDeliveries,
  notificationEvents,
  notificationMessages,
  notificationRecipients,
  userNotificationPreferences,
  userPushTokens,
} from './index';
import { patients, providers, users } from './schema';

describe('notification database schema', () => {
  test('exports normalized notification workflow tables', () => {
    expect(notificationMessages.id).toBeDefined();
    expect(notificationMessages.dedupeKey).toBeDefined();
    expect(notificationRecipients.messageId).toBeDefined();
    expect(notificationRecipients.recipientId).toBeDefined();
    expect(notificationDeliveries.messageRecipientId).toBeDefined();
    expect(notificationDeliveries.providerMessageId).toBeDefined();
    expect(notificationEvents.providerEventId).toBeDefined();
    expect(inAppNotifications.deliveryId).toBeDefined();
  });

  test('exports recipient preference and push-token tables', () => {
    expect(userNotificationPreferences.userId).toBeDefined();
    expect(userNotificationPreferences.category).toBeDefined();
    expect(userNotificationPreferences.inAppEnabled).toBeDefined();
    expect(userNotificationPreferences.emailEnabled).toBeDefined();
    expect(userNotificationPreferences.smsEnabled).toBeDefined();
    expect(userPushTokens.userId).toBeDefined();
    expect(userPushTokens.provider).toBeDefined();
    expect(userPushTokens.token).toBeDefined();
    expect(userPushTokens.isActive).toBeDefined();
  });

  test('adds user contact columns needed for recipient profile lookup', () => {
    expect(users.phone).toBeDefined();
    expect(patients.userId).toBeDefined();
    expect(patients.phone).toBeDefined();
    expect(providers.userId).toBeDefined();
    expect(providers.phone).toBeDefined();
  });
});
