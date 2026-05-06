import { sendTelnyxSms } from '../../../services/telnyx';

export class TwilioAdapter {
    async send(recipientId: string, to: string, body: string): Promise<{ providerMessageId: string | null }> {
        return sendTelnyxSms({ recipientId, to, text: body });
    }
}
