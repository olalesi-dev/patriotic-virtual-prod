export const notificationChannels = ['email', 'sms', 'in_app'] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

export const notificationPriorities = [
  'critical',
  'high',
  'medium',
  'low',
] as const;
export type NotificationPriority = (typeof notificationPriorities)[number];

export const notificationCategories = [
  'scheduling',
  'practitionerScheduling',
  'billing',
  'clientDocumentation',
  'workspace',
  'communications',
  'clinical',
] as const;
export type NotificationPreferenceCategory =
  (typeof notificationCategories)[number];

export const notificationTopics = [
  'PATIENT_WELCOME',
  'STAFF_ACCOUNT_CREATED',
  'PRIORITY_QUEUE_PAYMENT_SUCCESS_PATIENT',
  'PRIORITY_QUEUE_PAYMENT_SUCCESS_PROVIDER',
  'APPOINTMENT_BOOKED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_REMINDER_24H',
  'APPOINTMENT_REMINDER_8H',
  'APPOINTMENT_REMINDER_1H',
  'SECURE_MESSAGE_RECEIVED_PATIENT',
  'NEW_SECURE_MESSAGE_PROVIDER',
  'FAILED_PAYMENT_ALERT_PATIENT',
  'FAILED_PAYMENT_ALERT_ADMIN',
  'PRESCRIPTION_SENT_PATIENT',
  'PRESCRIPTION_ERROR_ADMIN',
] as const;
export type NotificationTopicKey = (typeof notificationTopics)[number];

export const notificationTemplateKeys = [
  'patient_welcome',
  'staff_welcome',
  'appointment_request_notification',
  'priority_queue_patient',
  'priority_queue_provider',
  'appointment_booked',
  'appointment_rescheduled',
  'appointment_cancelled',
  'appointment_reminder_24h',
  'appointment_reminder_8h',
  'appointment_reminder_1h',
  'secure_message_patient',
  'secure_message_provider',
  'failed_payment_patient',
  'failed_payment_admin',
  'prescription_sent_patient',
  'prescription_error_admin',
] as const;
export type NotificationTemplateKey =
  (typeof notificationTemplateKeys)[number];

export type InboxNotificationType =
  | 'account_created'
  | 'appointment_request'
  | 'appointment_booked'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'message_received'
  | 'alert';

export type NotificationDeliveryStatus =
  | 'queued'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'retry_scheduled'
  | 'failed'
  | 'bounced'
  | 'cancelled'
  | 'skipped';

export interface RecipientProfile {
  uid: string;
  email?: string;
  phone?: string;
  displayName: string;
  role?: string;
}

export interface NotificationTopicDefinition {
  topicKey: NotificationTopicKey;
  category: NotificationPreferenceCategory;
  priority: NotificationPriority;
  allowedChannels: NotificationChannel[];
  defaultChannels: NotificationChannel[];
  templateKey?: NotificationTemplateKey;
  containsPHI: boolean;
  requiresAudit: boolean;
  fromEmail: string;
  replyTo: string;
  dedupeWindowSeconds: number;
  bypassPreferences?: boolean;
  inboxType?: InboxNotificationType;
  buildInboxTitle(data: Record<string, unknown>): string | undefined;
  buildInboxBody(data: Record<string, unknown>): string | undefined;
  buildSmsBody?(data: Record<string, unknown>): string | undefined;
  buildHref?(data: Record<string, unknown>): string | undefined;
}

export interface NotificationRequest {
  topicKey: NotificationTopicKey;
  entityId: string;
  recipientIds: string[];
  templateData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
  channels?: NotificationChannel[];
  actorId?: string;
  actorName?: string;
  source?: string;
}

export interface ScheduleNotificationRequest extends NotificationRequest {
  sendAt: Date;
}

export interface DispatchTaskPayload {
  deliveryId: string;
}
