import sgMail from '@sendgrid/mail';

export interface SendGridTemplatePayload {
  to: string;
  fromEmail: string;
  replyTo: string;
  templateId: string;
  templateData: Record<string, unknown>;
  customArgs?: Record<string, string>;
}

export interface SendGridDispatchResult {
  providerMessageId?: string;
  responseCode: string;
}

export interface SendGridClient {
  setApiKey(apiKey: string): void;
  send(message: {
    to: string;
    from: string;
    replyTo: string;
    templateId: string;
    dynamicTemplateData: Record<string, unknown>;
    customArgs: Record<string, string>;
  }): Promise<{ headers: Record<string, string>; statusCode: number }[]>;
}

export interface SendGridSenderOptions {
  apiKey?: string;
  client?: SendGridClient;
}

export const sendSendGridTemplate = async (
  payload: SendGridTemplatePayload,
  options: SendGridSenderOptions = {},
): Promise<SendGridDispatchResult> => {
  const apiKey = options.apiKey ?? process.env.SENDGRID_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured.');
  }

  const client = options.client ?? (sgMail as SendGridClient);
  client.setApiKey(apiKey);

  const [response] = await client.send({
    to: payload.to,
    from: payload.fromEmail,
    replyTo: payload.replyTo,
    templateId: payload.templateId,
    dynamicTemplateData: payload.templateData,
    customArgs: payload.customArgs ?? {},
  });

  return {
    providerMessageId: response?.headers['x-message-id'],
    responseCode: `${response?.statusCode ?? ''}`,
  };
};
