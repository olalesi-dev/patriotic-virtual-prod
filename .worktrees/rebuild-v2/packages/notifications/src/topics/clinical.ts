import type { NotificationTopicDefinition, NotificationTopicKey } from '../types';

export const clinicalTopics: Partial<Record<NotificationTopicKey, NotificationTopicDefinition>> = {
  PRESCRIPTION_SENT_PATIENT: {
    topicKey: 'PRESCRIPTION_SENT_PATIENT',
    category: 'clinical',
    priority: 'medium',
    containsPHI: true,
    requiresAudit: true,
    allowedChannels: ['in_app', 'email'],
    defaultChannels: ['in_app'],
    templateKey: 'prescription_sent_patient',
    inboxType: 'message_received',
    fromEmail: 'clinical@patriotictelehealth.com',
    replyTo: 'clinical@patriotictelehealth.com',
    buildInboxTitle: (data) => `Prescription Sent: ${data.medicationName}`,
    buildInboxBody: (data) =>
      `Your prescription for ${data.medicationName} has been sent to the pharmacy.`,
    buildHref: (data) => `/patient/prescriptions`,
    dedupeWindowSeconds: 3600,
  },
  PRESCRIPTION_ERROR_ADMIN: {
    topicKey: 'PRESCRIPTION_ERROR_ADMIN',
    category: 'clinical',
    priority: 'high',
    containsPHI: true,
    requiresAudit: true,
    allowedChannels: ['in_app', 'email'],
    defaultChannels: ['in_app', 'email'],
    templateKey: 'prescription_error_admin',
    inboxType: 'alert',
    fromEmail: 'clinical@patriotictelehealth.com',
    replyTo: 'clinical@patriotictelehealth.com',
    buildInboxTitle: (data) => `Prescription Error: ${data.patientName}`,
    buildInboxBody: (data) =>
      `There was an error sending a prescription for ${data.patientName}: ${data.errorDetails}`,
    buildHref: (data) => `/admin/prescriptions`,
    dedupeWindowSeconds: 300,
  },
};
