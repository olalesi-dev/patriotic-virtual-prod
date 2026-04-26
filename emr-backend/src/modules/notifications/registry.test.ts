import test from 'node:test';
import assert from 'node:assert/strict';
import { getNotificationTopic } from './registry';

test('patient welcome topic uses hello sender and welcome inbox copy', () => {
    const topic = getNotificationTopic('PATIENT_WELCOME');

    assert.equal(topic.fromEmail, 'hello@patriotictelehealth.com');
    assert.deepEqual(topic.defaultChannels, ['email', 'in_app']);
    assert.equal(topic.buildInboxTitle({}), 'Welcome to Patriotic Telehealth');
});

test('secure patient message topic uses generic inbox content and email channel', () => {
    const topic = getNotificationTopic('SECURE_MESSAGE_RECEIVED_PATIENT');

    assert.deepEqual(topic.defaultChannels, ['email', 'in_app']);
    assert.equal(topic.containsPHI, false);
    assert.equal(topic.fromEmail, 'reply@patriotictelehealth.com');
    assert.equal(topic.buildInboxTitle({ actorName: 'Dr. Reyes' }), 'New message from Dr. Reyes');
    assert.equal(topic.buildInboxBody({}), 'You have a new secure message. Log in to review it.');
});

test('priority queue provider topic produces waitlist-oriented inbox content', () => {
    const topic = getNotificationTopic('PRIORITY_QUEUE_PAYMENT_SUCCESS_PROVIDER');

    assert.equal(topic.templateKey, 'appointment_request_notification');
    assert.equal(topic.inboxType, 'appointment_request');
    assert.equal(
        topic.buildInboxBody({ patientName: 'Alex Doe', serviceName: 'GLP-1' }),
        'Alex Doe submitted a request for GLP-1.',
    );
});

test('appointment reminder 8h topic projects an inbox reminder with provider-aware body', () => {
    const topic = getNotificationTopic('APPOINTMENT_REMINDER_8H');
    const body = topic.buildInboxBody({
        recipient_type: 'provider',
        patient_name: 'Alex Doe',
        appointmentAt: '2026-04-27T10:00:00.000Z',
    });

    assert.deepEqual(topic.defaultChannels, ['in_app']);
    assert.equal(topic.inboxType, 'appointment_reminder');
    assert.ok(body);
    assert.match(body, /^Your appointment with Alex Doe starts in 8 hours at /);
});
