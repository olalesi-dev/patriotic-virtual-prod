import { describe, expect, it } from 'bun:test';
import { buildNotificationDedupeKey } from './dedupe.policy';

describe('buildNotificationDedupeKey', () => {
  it('is order-independent for recipients and channels', () => {
    const first = buildNotificationDedupeKey({
      channels: ['in_app', 'email'],
      entityId: 'thread-1',
      recipientIds: ['b-user', 'a-user'],
      topicKey: 'SECURE_MESSAGE_RECEIVED_PATIENT',
    });

    const second = buildNotificationDedupeKey({
      channels: ['email', 'in_app'],
      entityId: 'thread-1',
      recipientIds: ['a-user', 'b-user'],
      topicKey: 'SECURE_MESSAGE_RECEIVED_PATIENT',
    });

    expect(first).toBe(second);
  });

  it('respects an explicit custom key', () => {
    expect(
      buildNotificationDedupeKey({
        channels: ['email'],
        customKey: ' explicit-key ',
        entityId: 'appt-1',
        recipientIds: ['patient-1'],
        topicKey: 'APPOINTMENT_BOOKED',
      }),
    ).toBe('explicit-key');
  });
});
