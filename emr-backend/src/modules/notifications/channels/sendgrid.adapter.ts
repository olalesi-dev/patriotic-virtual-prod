import sgMail from '@sendgrid/mail';
import { logger } from '../../../utils/logger';
import type { SendGridDispatchPayload, SendGridDispatchResult } from '../types';

const apiKey = process.env.SENDGRID_API_KEY?.trim();
const verboseEmailLogs = process.env.EMAIL_DEBUG_LOGS === 'true' || process.env.NODE_ENV !== 'production';

if (apiKey) {
    sgMail.setApiKey(apiKey);
}

function toErrorDetails(error: unknown): Record<string, unknown> {
    if (!(error instanceof Error)) {
        return { rawError: String(error) };
    }

    const typedError = error as Error & {
        code?: number | string;
        response?: {
            statusCode?: number;
            headers?: Record<string, string>;
            body?: unknown;
        };
    };

    return {
        message: typedError.message,
        code: typedError.code ?? null,
        statusCode: typedError.response?.statusCode ?? null,
        headers: typedError.response?.headers ?? null,
        body: typedError.response?.body ?? null,
    };
}

export class SendGridAdapter {
    async send(payload: SendGridDispatchPayload): Promise<SendGridDispatchResult> {
        if (!apiKey) {
            throw new Error('SENDGRID_API_KEY is not configured.');
        }

        if (verboseEmailLogs) {
            logger.info('SendGrid email attempt', {
                to: payload.to,
                from: payload.fromEmail,
                replyTo: payload.replyTo,
                templateId: payload.templateId,
                templateDataKeys: Object.keys(payload.templateData),
                customArgs: payload.customArgs,
            });
        }

        try {
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
                templateId: payload.templateId,
            });

            return {
                providerMessageId,
                responseCode,
            };
        } catch (error) {
            logger.error('SendGrid email dispatch failed', {
                to: payload.to,
                from: payload.fromEmail,
                replyTo: payload.replyTo,
                templateId: payload.templateId,
                templateDataKeys: Object.keys(payload.templateData),
                customArgs: payload.customArgs,
                error: toErrorDetails(error),
            });
            throw error;
        }
    }
}
