import { sendSms } from '../../../services/twilio';

export class TwilioAdapter {
    async send(to: string, body: string): Promise<{ providerMessageId: string | null }> {
        await sendSms(to, body);
        return {
            providerMessageId: null,
        };
    }
}
