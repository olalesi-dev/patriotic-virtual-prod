import { asString } from '../format';
import type { NotificationTopicDefinition } from '../types';

const replySender = {
  fromEmail: 'reply@patriotictelehealth.com',
  replyTo: 'reply@patriotictelehealth.com',
};

export const communicationTopics = {
  SECURE_MESSAGE_RECEIVED_PATIENT: {
    topicKey: 'SECURE_MESSAGE_RECEIVED_PATIENT',
    category: 'communications',
    priority: 'high',
    allowedChannels: ['email', 'in_app'],
    defaultChannels: ['email', 'in_app'],
    templateKey: 'secure_message_patient',
    containsPHI: false,
    requiresAudit: true,
    ...replySender,
    dedupeWindowSeconds: 60,
    inboxType: 'message_received',
    buildInboxTitle: (data) =>
      `New message from ${asString(data.actorName, 'your care team')}`,
    buildInboxBody: () =>
      'You have a new secure message. Log in to review it.',
    buildHref: () => '/patient/messages',
  },
  NEW_SECURE_MESSAGE_PROVIDER: {
    topicKey: 'NEW_SECURE_MESSAGE_PROVIDER',
    category: 'communications',
    priority: 'high',
    allowedChannels: ['email', 'in_app'],
    defaultChannels: ['email', 'in_app'],
    templateKey: 'secure_message_provider',
    containsPHI: false,
    requiresAudit: true,
    ...replySender,
    dedupeWindowSeconds: 60,
    inboxType: 'message_received',
    buildInboxTitle: (data) =>
      `New message from ${asString(data.actorName, 'patient')}`,
    buildInboxBody: () =>
      'A patient sent a new secure message. Open the inbox to respond.',
    buildHref: () => '/inbox',
  },
} satisfies Partial<Record<string, NotificationTopicDefinition>>;
