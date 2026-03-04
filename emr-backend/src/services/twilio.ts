import twilio from 'twilio';
import { logger } from '../utils/logger';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const sendSms = async (to: string, body: string) => {
    if (!client || !fromNumber) {
        logger.warn('Twilio credentials missing. Logging SMS instead:', { to, body });
        return;
    }

    try {
        await client.messages.create({
            body,
            from: fromNumber,
            to
        });
        logger.info('SMS sent successfully to', to);
    } catch (error) {
        logger.error('Failed to send SMS via Twilio', error);
    }
};
