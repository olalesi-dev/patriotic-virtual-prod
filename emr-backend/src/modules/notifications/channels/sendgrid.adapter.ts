import sgMail from '@sendgrid/mail';
import { logger } from '../../../utils/logger';
import type { SendGridDispatchPayload, SendGridDispatchResult } from '../types';

const apiKey = process.env.SENDGRID_API_KEY?.trim();

if (apiKey) {
    sgMail.setApiKey(apiKey);
}

export class SendGridAdapter {
    async send(payload: SendGridDispatchPayload): Promise<SendGridDispatchResult> {
        if (!apiKey) {
            throw new Error('SENDGRID_API_KEY is not configured.');
        }

        const [response] = await sgMail.send({
            to: payload.to,
            from: payload.fromEmail,
            replyTo: payload.replyTo,
            templateId: payload.templateId,
            dynamicTemplateData: payload.templateData,
            customArgs: payload.customArgs,
        });

        const providerMessageId = response.headers['x-message-id'] ?? null;
        const responseCode = `${response.statusCode}`;

        logger.info('Notification email dispatched via SendGrid', {
            to: payload.to,
            from: payload.fromEmail,
            responseCode,
            providerMessageId,
        });

        return {
            providerMessageId,
            responseCode,
        };
    }
}
