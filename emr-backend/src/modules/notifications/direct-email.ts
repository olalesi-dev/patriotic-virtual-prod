import { SendGridAdapter } from './channels/sendgrid.adapter';
import { resolveTemplateId } from './templates/template.mapper';
import type { NotificationTemplateKey, SendGridDispatchResult } from './types';
import { logger } from '../../utils/logger';

const sendGridAdapter = new SendGridAdapter();
const verboseEmailLogs = process.env.EMAIL_DEBUG_LOGS === 'true' || process.env.NODE_ENV !== 'production';

interface DirectTemplateConfig {
    fromEmail: string;
    replyTo: string;
}

const DIRECT_TEMPLATE_CONFIG: Partial<Record<NotificationTemplateKey, DirectTemplateConfig>> = {
    patient_welcome: {
        fromEmail: 'hello@patriotictelehealth.com',
        replyTo: 'hello@patriotictelehealth.com',
    },
    staff_welcome: {
        fromEmail: 'hello@patriotictelehealth.com',
        replyTo: 'hello@patriotictelehealth.com',
    },
    appointment_request_notification: {
        fromEmail: 'waitlist@patriotictelehealth.com',
        replyTo: 'waitlist@patriotictelehealth.com',
    },
    appointment_booked: {
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
    },
    appointment_rescheduled: {
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
    },
    appointment_cancelled: {
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
    },
    appointment_reminder_24h: {
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
    },
    appointment_reminder_1h: {
        fromEmail: 'support@patriotictelehealth.com',
        replyTo: 'support@patriotictelehealth.com',
    },
};

export async function sendDirectTemplateEmail(input: {
    templateKey: NotificationTemplateKey;
    toEmail: string;
    templateData: Record<string, unknown>;
    customArgs?: Record<string, string>;
}): Promise<SendGridDispatchResult> {
    const config = DIRECT_TEMPLATE_CONFIG[input.templateKey];
    if (!config) {
        throw new Error(`Direct template email is not configured for ${input.templateKey}.`);
    }

    if (verboseEmailLogs) {
        logger.info('Sending direct template email', {
            templateKey: input.templateKey,
            toEmail: input.toEmail,
            fromEmail: config.fromEmail,
            templateDataKeys: Object.keys(input.templateData),
            customArgs: input.customArgs ?? {},
        });
    }

    return sendGridAdapter.send({
        to: input.toEmail,
        fromEmail: config.fromEmail,
        replyTo: config.replyTo,
        templateId: await resolveTemplateId(input.templateKey),
        templateData: input.templateData,
        customArgs: input.customArgs ?? {},
    });
}
