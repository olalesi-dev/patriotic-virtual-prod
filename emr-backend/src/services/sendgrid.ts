import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'waitlist@patriotictelehealth.com';

if (apiKey) {
    sgMail.setApiKey(apiKey);
}

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    if (!apiKey) {
        logger.warn('SendGrid API Key missing. Skipping email to:', to);
        return;
    }

    const msg = {
        to,
        from: fromEmail,
        replyTo: fromEmail,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>'),
    };

    try {
        await sgMail.send(msg);
        logger.info('Email sent successfully via SendGrid to', to);
    } catch (error: any) {
        logger.error('Failed to send email via SendGrid', error);
        if (error.response) {
            logger.error(error.response.body);
        }
    }
};
