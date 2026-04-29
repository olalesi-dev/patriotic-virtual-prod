import type { NotificationTopicDefinition } from '../types';

const billingSender = {
  fromEmail: 'billing@patriotictelehealth.com',
  replyTo: 'billing@patriotictelehealth.com',
};

export const billingTopics = {
  FAILED_PAYMENT_ALERT_PATIENT: {
    topicKey: 'FAILED_PAYMENT_ALERT_PATIENT',
    category: 'billing',
    priority: 'critical',
    allowedChannels: ['email'],
    defaultChannels: ['email'],
    templateKey: 'failed_payment_patient',
    containsPHI: false,
    requiresAudit: true,
    ...billingSender,
    dedupeWindowSeconds: 3600,
    buildInboxTitle: () => undefined,
    buildInboxBody: () => undefined,
    buildHref: () => '/patient/billing',
  },
  FAILED_PAYMENT_ALERT_ADMIN: {
    topicKey: 'FAILED_PAYMENT_ALERT_ADMIN',
    category: 'billing',
    priority: 'critical',
    allowedChannels: ['email'],
    defaultChannels: ['email'],
    templateKey: 'failed_payment_admin',
    containsPHI: false,
    requiresAudit: true,
    ...billingSender,
    dedupeWindowSeconds: 3600,
    bypassPreferences: true,
    buildInboxTitle: () => undefined,
    buildInboxBody: () => undefined,
    buildHref: () => '/billing',
  },
} satisfies Partial<Record<string, NotificationTopicDefinition>>;
