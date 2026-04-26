import type { NotificationTemplateKey } from '../types';

interface SendGridTemplateConfig {
    envKey: string;
    templateName: string;
}

const TEMPLATE_CONFIG: Record<NotificationTemplateKey, SendGridTemplateConfig> = {
    patient_welcome: {
        envKey: 'SENDGRID_TEMPLATE_PATIENT_WELCOME',
        templateName: 'patient_welcome',
    },
    staff_welcome: {
        envKey: 'SENDGRID_TEMPLATE_STAFF_WELCOME',
        templateName: 'staff_welcome',
    },
    appointment_request_notification: {
        envKey: 'SENDGRID_TEMPLATE_APPOINTMENT_REQUEST_NOTIFICATION',
        templateName: 'appointment_request_notification',
    },
    priority_queue_patient: {
        envKey: 'SENDGRID_TEMPLATE_PRIORITY_QUEUE_PATIENT',
        templateName: 'priority_queue_patient',
    },
    priority_queue_provider: {
        envKey: 'SENDGRID_TEMPLATE_PRIORITY_QUEUE_PROVIDER',
        templateName: 'priority_queue_provider',
    },
    appointment_booked: {
        envKey: 'SENDGRID_TEMPLATE_APPOINTMENT_BOOKED',
        templateName: 'appointment_booked',
    },
    appointment_rescheduled: {
        envKey: 'SENDGRID_TEMPLATE_APPOINTMENT_RESCHEDULED',
        templateName: 'appointment_rescheduled',
    },
    appointment_cancelled: {
        envKey: 'SENDGRID_TEMPLATE_APPOINTMENT_CANCELLED',
        templateName: 'appointment_cancelled',
    },
    appointment_reminder_24h: {
        envKey: 'SENDGRID_TEMPLATE_APPOINTMENT_REMINDER_24H',
        templateName: 'appointment_reminder_24h',
    },
    appointment_reminder_8h: {
        envKey: 'SENDGRID_TEMPLATE_APPOINTMENT_REMINDER_8H',
        templateName: 'appointment_reminder_8h',
    },
    appointment_reminder_1h: {
        envKey: 'SENDGRID_TEMPLATE_APPOINTMENT_REMINDER_1H',
        templateName: 'appointment_reminder_1h',
    },
    secure_message_patient: {
        envKey: 'SENDGRID_TEMPLATE_SECURE_MESSAGE_PATIENT',
        templateName: 'secure_message_patient',
    },
    secure_message_provider: {
        envKey: 'SENDGRID_TEMPLATE_SECURE_MESSAGE_PROVIDER',
        templateName: 'secure_message_provider',
    },
    failed_payment_patient: {
        envKey: 'SENDGRID_TEMPLATE_FAILED_PAYMENT_PATIENT',
        templateName: 'failed_payment_patient',
    },
    failed_payment_admin: {
        envKey: 'SENDGRID_TEMPLATE_FAILED_PAYMENT_ADMIN',
        templateName: 'failed_payment_admin',
    },
};

let cachedTemplatesByName: Map<string, string> | null = null;

function sendGridApiKey(): string {
    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('SENDGRID_API_KEY is not configured.');
    }

    return apiKey;
}

async function fetchDynamicTemplates(): Promise<Map<string, string>> {
    if (cachedTemplatesByName) {
        return cachedTemplatesByName;
    }

    const response = await fetch('https://api.sendgrid.com/v3/templates?generations=dynamic&page_size=200', {
        headers: {
            Authorization: `Bearer ${sendGridApiKey()}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch SendGrid templates: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as {
        result?: Array<{
            id?: string;
            name?: string;
        }>;
    };

    const templates = new Map<string, string>();
    for (const template of payload.result ?? []) {
        const templateId = typeof template.id === 'string' ? template.id.trim() : '';
        const templateName = typeof template.name === 'string' ? template.name.trim() : '';

        if (!templateId || !templateName) {
            continue;
        }

        templates.set(templateName, templateId);
    }

    cachedTemplatesByName = templates;
    return templates;
}

export function getTemplateConfig(templateKey: NotificationTemplateKey): SendGridTemplateConfig {
    return TEMPLATE_CONFIG[templateKey];
}

export async function resolveTemplateId(templateKey: NotificationTemplateKey): Promise<string> {
    const config = getTemplateConfig(templateKey);
    const configuredTemplateId = process.env[config.envKey]?.trim();
    if (configuredTemplateId) {
        return configuredTemplateId;
    }

    const templatesByName = await fetchDynamicTemplates();
    const discoveredTemplateId = templatesByName.get(config.templateName);
    if (discoveredTemplateId) {
        return discoveredTemplateId;
    }

    throw new Error(
        `Missing SendGrid template id configuration for ${templateKey} (${config.envKey}) and no dynamic template named "${config.templateName}" was found.`,
    );
}
