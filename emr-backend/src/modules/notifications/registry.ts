import type { NotificationTopicDefinition, NotificationTopicKey } from './types';

function asString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function asOptionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function formatDateTime(value: unknown): string {
    const parsed = typeof value === 'string' || value instanceof Date ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return 'your scheduled time';

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(parsed);
}

function readRecipientType(data: Record<string, unknown>): 'patient' | 'provider' {
    return data.recipient_type === 'provider' ? 'provider' : 'patient';
}

function readPatientName(data: Record<string, unknown>): string {
    return asString(data.patient_name ?? data.patientName, 'the patient');
}

function readProviderName(data: Record<string, unknown>): string {
    return asString(data.provider_name ?? data.providerName, 'your care team');
}

function readPortalLink(data: Record<string, unknown>, fallback: string): string {
    return asOptionalString(data.portalLink) ?? fallback;
}

function buildReminderBody(data: Record<string, unknown>, leadTimeLabel: string): string {
    const recipientType = readRecipientType(data);
    const patientName = readPatientName(data);
    const providerName = readProviderName(data);
    const appointmentAt = formatDateTime(data.appointmentAt);

    if (recipientType === 'provider') {
        return `Your appointment with ${patientName} starts in ${leadTimeLabel} at ${appointmentAt}.`;
    }

    return `Your appointment with ${providerName} starts in ${leadTimeLabel} at ${appointmentAt}.`;
}

export const notificationRegistry: Record<NotificationTopicKey, NotificationTopicDefinition> = {
    PATIENT_WELCOME: {
        topicKey: 'PATIENT_WELCOME',
        category: 'workspace',
        priority: 'medium',
        allowedChannels: ['email', 'in_app'],
        defaultChannels: ['email', 'in_app'],
        templateKey: 'patient_welcome',
        containsPHI: false,
        requiresAudit: true,
        fromEmail: 'hello@patriotictelehealth.com',
        replyTo: 'hello@patriotictelehealth.com',
        dedupeWindowSeconds: 86400,
        inboxType: 'account_created',
        buildInboxTitle: () => 'Welcome to Patriotic Telehealth',
        buildInboxBody: () => 'Your account is ready. Sign in to complete your next steps.',
        buildHref: () => '/patient',
    },
    STAFF_ACCOUNT_CREATED: {
        topicKey: 'STAFF_ACCOUNT_CREATED',
        category: 'workspace',
        priority: 'medium',
        allowedChannels: ['in_app'],
        defaultChannels: ['in_app'],
        templateKey: null,
        containsPHI: false,
        requiresAudit: true,
        fromEmail: 'hello@patriotictelehealth.com',
        replyTo: 'hello@patriotictelehealth.com',
        dedupeWindowSeconds: 86400,
        inboxType: 'account_created',
        buildInboxTitle: () => 'Your account is ready',
        buildInboxBody: (data) => {
            const roleLabel = asString(data.roleLabel, 'team');
            return `Your ${roleLabel.toLowerCase()} account has been created. Sign in to get started.`;
        },
        buildHref: () => '/login',
    },
    PRIORITY_QUEUE_PAYMENT_SUCCESS_PATIENT: {
        topicKey: 'PRIORITY_QUEUE_PAYMENT_SUCCESS_PATIENT',
        category: 'workspace',
        priority: 'high',
        allowedChannels: ['email', 'in_app'],
        defaultChannels: ['email', 'in_app'],
        templateKey: 'appointment_request_notification',
        containsPHI: false,
        requiresAudit: true,
        fromEmail: 'waitlist@patriotictelehealth.com',
        replyTo: 'waitlist@patriotictelehealth.com',
        dedupeWindowSeconds: 3600,
        inboxType: 'appointment_request',
        buildInboxTitle: () => 'Consultation request received',
        buildInboxBody: (data) => {
            const serviceName = asString(data.serviceName, 'your consultation');
            return `We received your request for ${serviceName}. A provider will review it shortly.`;
        },
        buildHref: () => '/patient/appointments',
    },
    PRIORITY_QUEUE_PAYMENT_SUCCESS_PROVIDER: {
        topicKey: 'PRIORITY_QUEUE_PAYMENT_SUCCESS_PROVIDER',
        category: 'practitionerScheduling',
        priority: 'critical',
        allowedChannels: ['email', 'in_app'],
        defaultChannels: ['email', 'in_app'],
        templateKey: 'appointment_request_notification',
        containsPHI: false,
        requiresAudit: true,
        fromEmail: 'waitlist@patriotictelehealth.com',
        replyTo: 'waitlist@patriotictelehealth.com',
        dedupeWindowSeconds: 1800,
        bypassPreferences: true,
        inboxType: 'appointment_request',
        buildInboxTitle: () => 'New consultation request',
        buildInboxBody: (data) => {
            const patientName = asString(data.patientName, 'A patient');
            const serviceName = asString(data.serviceName, 'a consultation');
            return `${patientName} submitted a request for ${serviceName}.`;
        },
        buildHref: () => '/waitlist',
    },
    APPOINTMENT_BOOKED: {
        topicKey: 'APPOINTMENT_BOOKED',
        category: 'scheduling',
        priority: 'high',
        allowedChannels: ['email', 'in_app'],
        defaultChannels: ['email', 'in_app'],
        templateKey: 'appointment_booked',
        containsPHI: false,
        requiresAudit: true,
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
        dedupeWindowSeconds: 900,
        inboxType: 'appointment_booked',
        buildInboxTitle: (data) => readRecipientType(data) === 'provider'
            ? `Appointment booked with ${readPatientName(data)}`
            : 'Appointment booked',
        buildInboxBody: (data) => {
            if (readRecipientType(data) === 'provider') {
                return `${readPatientName(data)} is scheduled for ${formatDateTime(data.appointmentAt)}.`;
            }

            return `Your appointment with ${readProviderName(data)} is scheduled for ${formatDateTime(data.appointmentAt)}.`;
        },
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
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
        dedupeWindowSeconds: 900,
        inboxType: 'appointment_rescheduled',
        buildInboxTitle: (data) => readRecipientType(data) === 'provider'
            ? `Appointment rescheduled with ${readPatientName(data)}`
            : 'Appointment rescheduled',
        buildInboxBody: (data) => readRecipientType(data) === 'provider'
            ? `${readPatientName(data)} was moved to ${formatDateTime(data.appointmentAt)}.`
            : `Your appointment has been moved to ${formatDateTime(data.appointmentAt)}.`,
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
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
        dedupeWindowSeconds: 900,
        inboxType: 'appointment_cancelled',
        buildInboxTitle: (data) => readRecipientType(data) === 'provider'
            ? `Appointment cancelled with ${readPatientName(data)}`
            : 'Appointment cancelled',
        buildInboxBody: (data) => readRecipientType(data) === 'provider'
            ? `${readPatientName(data)} was cancelled for ${formatDateTime(data.appointmentAt)}.`
            : `Your appointment scheduled for ${formatDateTime(data.appointmentAt)} was cancelled.`,
        buildHref: (data) => readPortalLink(data, '/patient/appointments'),
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
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
        dedupeWindowSeconds: 86400,
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
        templateKey: null,
        containsPHI: false,
        requiresAudit: true,
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
        dedupeWindowSeconds: 28800,
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
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
        dedupeWindowSeconds: 3600,
        inboxType: 'appointment_reminder',
        buildInboxTitle: () => 'Appointment reminder: 1 hour',
        buildInboxBody: (data) => buildReminderBody(data, '1 hour'),
        buildHref: (data) => readPortalLink(data, '/patient/scheduled'),
    },
    SECURE_MESSAGE_RECEIVED_PATIENT: {
        topicKey: 'SECURE_MESSAGE_RECEIVED_PATIENT',
        category: 'communications',
        priority: 'high',
        allowedChannels: ['email', 'in_app'],
        defaultChannels: ['email', 'in_app'],
        templateKey: 'secure_message_patient',
        containsPHI: false,
        requiresAudit: true,
        fromEmail: 'reply@patriotictelehealth.com',
        replyTo: 'reply@patriotictelehealth.com',
        dedupeWindowSeconds: 60,
        inboxType: 'message_received',
        buildInboxTitle: (data) => `New message from ${asString(data.actorName, 'your care team')}`,
        buildInboxBody: () => 'You have a new secure message. Log in to review it.',
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
        fromEmail: 'reply@patriotictelehealth.com',
        replyTo: 'reply@patriotictelehealth.com',
        dedupeWindowSeconds: 60,
        inboxType: 'message_received',
        buildInboxTitle: (data) => `New message from ${asString(data.actorName, 'patient')}`,
        buildInboxBody: () => 'A patient sent a new secure message. Open the inbox to respond.',
        buildHref: () => '/inbox',
    },
    FAILED_PAYMENT_ALERT_PATIENT: {
        topicKey: 'FAILED_PAYMENT_ALERT_PATIENT',
        category: 'billing',
        priority: 'critical',
        allowedChannels: ['email'],
        defaultChannels: ['email'],
        templateKey: 'failed_payment_patient',
        containsPHI: false,
        requiresAudit: true,
        fromEmail: 'billing@patriotictelehealth.com',
        replyTo: 'billing@patriotictelehealth.com',
        dedupeWindowSeconds: 3600,
        inboxType: null,
        buildInboxTitle: () => null,
        buildInboxBody: () => null,
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
        fromEmail: 'billing@patriotictelehealth.com',
        replyTo: 'billing@patriotictelehealth.com',
        dedupeWindowSeconds: 3600,
        bypassPreferences: true,
        inboxType: null,
        buildInboxTitle: () => null,
        buildInboxBody: () => null,
        buildHref: () => '/billing',
    },
};

export function getNotificationTopic(topicKey: NotificationTopicKey): NotificationTopicDefinition {
    return notificationRegistry[topicKey];
}
