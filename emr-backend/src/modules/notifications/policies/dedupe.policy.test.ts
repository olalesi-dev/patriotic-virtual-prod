import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationDedupeKey } from './dedupe.policy';

test('buildNotificationDedupeKey is order-independent for recipients and channels', () => {
    const first = buildNotificationDedupeKey({
        topicKey: 'SECURE_MESSAGE_RECEIVED_PATIENT',
        entityId: 'thread-1',
        recipientIds: ['b-user', 'a-user'],
        channels: ['in_app', 'email'],
    });

    const second = buildNotificationDedupeKey({
        topicKey: 'SECURE_MESSAGE_RECEIVED_PATIENT',
        entityId: 'thread-1',
        recipientIds: ['a-user', 'b-user'],
        channels: ['email', 'in_app'],
    });

    assert.equal(first, second);
});

test('buildNotificationDedupeKey respects an explicit custom key', () => {
    const dedupeKey = buildNotificationDedupeKey({
        topicKey: 'APPOINTMENT_BOOKED',
        entityId: 'appt-1',
        recipientIds: ['patient-1'],
        channels: ['email'],
        customKey: 'explicit-key',
    });

    assert.equal(dedupeKey, 'explicit-key');
});

