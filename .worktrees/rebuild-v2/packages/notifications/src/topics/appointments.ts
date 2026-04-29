import {
  buildReminderBody,
  formatNotificationDateTime,
  readPatientName,
  readPortalLink,
  readProviderName,
  readRecipientType,
} from '../format';
import type { NotificationTopicDefinition } from '../types';

const supportSender = {
  fromEmail: 'support@patriotictelehealth.com',
  replyTo: 'support@patriotictelehealth.com',
};

export const appointmentTopics = {
  APPOINTMENT_BOOKED: {
    topicKey: 'APPOINTMENT_BOOKED',
    category: 'scheduling',
    priority: 'high',
    allowedChannels: ['email', 'in_app'],
    defaultChannels: ['email', 'in_app'],
    templateKey: 'appointment_booked',
    containsPHI: false,
    requiresAudit: true,
    ...supportSender,
    dedupeWindowSeconds: 900,
    inboxType: 'appointment_booked',
    buildInboxTitle: (data) =>
      readRecipientType(data) === 'provider'
        ? `Appointment booked with ${readPatientName(data)}`
        : 'Appointment booked',
    buildInboxBody: (data) =>
      readRecipientType(data) === 'provider'
        ? `${readPatientName(data)} is scheduled for ${formatNotificationDateTime(data.appointmentAt)}.`
        : `Your appointment with ${readProviderName(data)} is scheduled for ${formatNotificationDateTime(data.appointmentAt)}.`,
    buildHref: (data) => readPortalLink(data, '/patient/scheduled'),
  },
  APPOINTMENT_RESCHEDULED: {
    topicKey: 'APPOINTMENT_RESCHEDULED',
    category: 'scheduling',
    priority: 'high',
    allowedChannels: ['email', 'in_app'],
    defaultChannels: ['email', 'in_app'],
    templateKey: 'appointment_rescheduled',
    containsPHI: false,
    requiresAudit: true,
    ...supportSender,
    dedupeWindowSeconds: 900,
    inboxType: 'appointment_rescheduled',
    buildInboxTitle: (data) =>
      readRecipientType(data) === 'provider'
        ? `Appointment rescheduled with ${readPatientName(data)}`
        : 'Appointment rescheduled',
    buildInboxBody: (data) =>
      readRecipientType(data) === 'provider'
        ? `${readPatientName(data)} was moved to ${formatNotificationDateTime(data.appointmentAt)}.`
        : `Your appointment has been moved to ${formatNotificationDateTime(data.appointmentAt)}.`,
    buildHref: (data) => readPortalLink(data, '/patient/scheduled'),
  },
  APPOINTMENT_CANCELLED: {
    topicKey: 'APPOINTMENT_CANCELLED',
    category: 'scheduling',
    priority: 'high',
    allowedChannels: ['email', 'in_app'],
    defaultChannels: ['email', 'in_app'],
    templateKey: 'appointment_cancelled',
    containsPHI: false,
    requiresAudit: true,
    ...supportSender,
    dedupeWindowSeconds: 900,
    inboxType: 'appointment_cancelled',
    buildInboxTitle: (data) =>
      readRecipientType(data) === 'provider'
        ? `Appointment cancelled with ${readPatientName(data)}`
        : 'Appointment cancelled',
    buildInboxBody: (data) =>
      readRecipientType(data) === 'provider'
        ? `${readPatientName(data)} was cancelled for ${formatNotificationDateTime(data.appointmentAt)}.`
        : `Your appointment scheduled for ${formatNotificationDateTime(data.appointmentAt)} was cancelled.`,
    buildHref: () => '/patient/appointments',
  },
  APPOINTMENT_REMINDER_24H: {
    topicKey: 'APPOINTMENT_REMINDER_24H',
    category: 'scheduling',
    priority: 'medium',
    allowedChannels: ['email', 'in_app'],
    defaultChannels: ['email'],
    templateKey: 'appointment_reminder_24h',
    containsPHI: false,
    requiresAudit: true,
    ...supportSender,
    dedupeWindowSeconds: 86_400,
    inboxType: 'appointment_reminder',
    buildInboxTitle: () => 'Appointment reminder: 24 hours',
    buildInboxBody: (data) => buildReminderBody(data, '24 hours'),
    buildHref: (data) => readPortalLink(data, '/patient/scheduled'),
  },
  APPOINTMENT_REMINDER_8H: {
    topicKey: 'APPOINTMENT_REMINDER_8H',
    category: 'scheduling',
    priority: 'medium',
    allowedChannels: ['in_app'],
    defaultChannels: ['in_app'],
    containsPHI: false,
    requiresAudit: true,
    ...supportSender,
    dedupeWindowSeconds: 28_800,
    inboxType: 'appointment_reminder',
    buildInboxTitle: () => 'Appointment reminder: 8 hours',
    buildInboxBody: (data) => buildReminderBody(data, '8 hours'),
    buildHref: (data) => readPortalLink(data, '/patient/scheduled'),
  },
  APPOINTMENT_REMINDER_1H: {
    topicKey: 'APPOINTMENT_REMINDER_1H',
    category: 'scheduling',
    priority: 'high',
    allowedChannels: ['email', 'in_app'],
    defaultChannels: ['email'],
    templateKey: 'appointment_reminder_1h',
    containsPHI: false,
    requiresAudit: true,
    ...supportSender,
    dedupeWindowSeconds: 3600,
    inboxType: 'appointment_reminder',
    buildInboxTitle: () => 'Appointment reminder: 1 hour',
    buildInboxBody: (data) => buildReminderBody(data, '1 hour'),
    buildHref: (data) => readPortalLink(data, '/patient/scheduled'),
  },
} satisfies Partial<Record<string, NotificationTopicDefinition>>;
