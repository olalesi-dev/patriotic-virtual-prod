import { describe, expect, it } from 'bun:test';
import {
  getNotificationTopic,
  listNotificationTopics,
  notificationRegistry,
} from './registry';
import { notificationTopics } from './types';

describe('notification registry', () => {
  it('defines every notification topic exactly once', () => {
    expect(Object.keys(notificationRegistry).sort()).toEqual(
      [...notificationTopics].sort(),
    );
    expect(listNotificationTopics()).toHaveLength(notificationTopics.length);
  });

  it('keeps patient welcome sender and inbox copy', () => {
    const topic = getNotificationTopic('PATIENT_WELCOME');

    expect(topic.fromEmail).toBe('hello@patriotictelehealth.com');
    expect(topic.defaultChannels).toEqual(['email', 'in_app']);
    expect(topic.buildInboxTitle({})).toBe('Welcome to Patriotic Telehealth');
  });

  it('keeps secure patient message content generic', () => {
    const topic = getNotificationTopic('SECURE_MESSAGE_RECEIVED_PATIENT');

    expect(topic.defaultChannels).toEqual(['email', 'in_app']);
    expect(topic.containsPHI).toBe(false);
    expect(topic.fromEmail).toBe('reply@patriotictelehealth.com');
    expect(topic.buildInboxTitle({ actorName: 'Dr. Reyes' })).toBe(
      'New message from Dr. Reyes',
    );
    expect(topic.buildInboxBody({})).toBe(
      'You have a new secure message. Log in to review it.',
    );
  });

  it('keeps priority queue provider waitlist content', () => {
    const topic = getNotificationTopic('PRIORITY_QUEUE_PAYMENT_SUCCESS_PROVIDER');

    expect(topic.templateKey).toBe('appointment_request_notification');
    expect(topic.inboxType).toBe('appointment_request');
    expect(
      topic.buildInboxBody({
        patientName: 'Alex Doe',
        serviceName: 'GLP-1',
      }),
    ).toBe('Alex Doe submitted a request for GLP-1.');
  });

  it('formats provider appointment reminders', () => {
    const topic = getNotificationTopic('APPOINTMENT_REMINDER_8H');
    const body = topic.buildInboxBody({
      appointmentAt: '2026-04-27T10:00:00.000Z',
      patient_name: 'Alex Doe',
      recipient_type: 'provider',
    });

    expect(topic.defaultChannels).toEqual(['in_app']);
    expect(topic.inboxType).toBe('appointment_reminder');
    expect(body).toMatch(/^Your appointment with Alex Doe starts in 8 hours at /);
  });
});
