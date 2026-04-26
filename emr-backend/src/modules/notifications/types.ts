export const NOTIFICATION_CHANNELS = ['email', 'sms', 'in_app'] as const;
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number];

export const NOTIFICATION_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export type NotificationPriority = typeof NOTIFICATION_PRIORITIES[number];

export const NOTIFICATION_CATEGORIES = [
    'scheduling',
    'practitionerScheduling',
    'billing',
    'clientDocumentation',
    'workspace',
    'communications',
] as const;
export type NotificationPreferenceCategory = typeof NOTIFICATION_CATEGORIES[number];

export const NOTIFICATION_TOPICS = [
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
] as const;
export type NotificationTopicKey = typeof NOTIFICATION_TOPICS[number];

export const NOTIFICATION_TEMPLATE_KEYS = [
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
] as const;
export type NotificationTemplateKey = typeof NOTIFICATION_TEMPLATE_KEYS[number];

export type InboxNotificationType =
    | 'account_created'
    | 'appointment_request'
    | 'appointment_booked'
    | 'appointment_rescheduled'
    | 'appointment_cancelled'
    | 'appointment_reminder'
    | 'message_received';

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
    email: string | null;
    phone: string | null;
    displayName: string;
    role: string | null;
}

export interface NotificationTopicDefinition {
    topicKey: NotificationTopicKey;
    category: NotificationPreferenceCategory;
    priority: NotificationPriority;
    allowedChannels: NotificationChannel[];
    defaultChannels: NotificationChannel[];
    templateKey: NotificationTemplateKey | null;
    containsPHI: boolean;
    requiresAudit: boolean;
    fromEmail: string;
    replyTo: string;
    dedupeWindowSeconds: number;
    bypassPreferences?: boolean;
    inboxType: InboxNotificationType | null;
    buildInboxTitle(data: Record<string, unknown>): string | null;
    buildInboxBody(data: Record<string, unknown>): string | null;
    buildSmsBody?(data: Record<string, unknown>): string | null;
    buildHref?(data: Record<string, unknown>): string | null;
}

export interface NotificationRequest {
    topicKey: NotificationTopicKey;
    entityId: string;
    recipientIds: string[];
    templateData: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    dedupeKey?: string;
    channels?: NotificationChannel[];
    actorId?: string | null;
    actorName?: string | null;
    source?: string | null;
}

export interface ScheduleNotificationRequest extends NotificationRequest {
    sendAt: Date;
}

export interface NotificationMessageRecord {
    id: string;
    topicKey: NotificationTopicKey;
    entityId: string;
    dedupeKey: string;
    status: 'queued' | 'cancelled' | 'completed' | 'skipped';
    priority: NotificationPriority;
    category: NotificationPreferenceCategory;
    containsPHI: boolean;
    requiresAudit: boolean;
    actorId: string | null;
    actorName: string | null;
    source: string | null;
    templateData: Record<string, unknown>;
    metadata: Record<string, unknown>;
    scheduledFor: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationDeliveryRecord {
    id: string;
    messageId: string;
    topicKey: NotificationTopicKey;
    entityId: string;
    recipientId: string;
    channel: NotificationChannel;
    dedupeKey: string;
    status: NotificationDeliveryStatus;
    attemptCount: number;
    provider: string | null;
    providerMessageId: string | null;
    providerResponseCode: string | null;
    taskName: string | null;
    projectedNotificationId: string | null;
    scheduledFor: Date | null;
    sentAt: Date | null;
    deliveredAt: Date | null;
    failedAt: Date | null;
    lastError: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationEventRecord {
    id: string;
    deliveryId: string | null;
    provider: string;
    eventType: string;
    providerEventId: string;
    providerMessageId: string | null;
    payload: Record<string, unknown>;
    occurredAt: Date;
    processedAt: Date;
}

export interface DispatchTaskPayload {
    deliveryId: string;
}

export interface SendGridDispatchPayload {
    to: string;
    fromEmail: string;
    replyTo: string;
    templateId: string;
    templateData: Record<string, unknown>;
    customArgs: Record<string, string>;
}

export interface SendGridDispatchResult {
    providerMessageId: string | null;
    responseCode: string | null;
}
