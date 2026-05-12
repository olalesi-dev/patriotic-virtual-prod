import sgMail from '@sendgrid/mail';

export interface SendGridTemplatePayload {
  to: string;
  fromEmail: string;
  replyTo: string;
  templateId: string;
  templateData: Record<string, unknown>;
  customArgs?: Record<string, string>;
}

export interface SendGridPlainEmailPayload {
  to: string;
  fromEmail: string;
  replyTo: string;
  subject: string;
  text: string;
  html?: string;
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

export interface SendGridPlainEmailClient {
  setApiKey(apiKey: string): void;
  send(message: {
    to: string;
    from: string;
    replyTo: string;
    subject: string;
    text: string;
    html?: string;
    customArgs: Record<string, string>;
  }): Promise<{ headers: Record<string, string>; statusCode: number }[]>;
}

export interface SendGridSenderOptions {
  apiKey?: string;
  client?: SendGridClient;
}

export interface SendGridPlainEmailOptions {
  apiKey?: string;
  client?: SendGridPlainEmailClient;
}

const resolveApiKey = (apiKey?: string): string => {
  const resolved = apiKey ?? process.env.SENDGRID_API_KEY?.trim();

  if (!resolved) {
    throw new Error('SENDGRID_API_KEY is not configured.');
  }

  return resolved;
};

export const sendSendGridTemplate = async (
  payload: SendGridTemplatePayload,
  options: SendGridSenderOptions = {},
): Promise<SendGridDispatchResult> => {
  const client = options.client ?? (sgMail as SendGridClient);
  client.setApiKey(resolveApiKey(options.apiKey));

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

export const sendSendGridPlainEmail = async (
  payload: SendGridPlainEmailPayload,
  options: SendGridPlainEmailOptions = {},
): Promise<SendGridDispatchResult> => {
  const client = options.client ?? (sgMail as SendGridPlainEmailClient);
  client.setApiKey(resolveApiKey(options.apiKey));

  const [response] = await client.send({
    to: payload.to,
    from: payload.fromEmail,
    replyTo: payload.replyTo,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    customArgs: payload.customArgs ?? {},
  });

  return {
    providerMessageId: response?.headers['x-message-id'],
    responseCode: `${response?.statusCode ?? ''}`,
  };
};
