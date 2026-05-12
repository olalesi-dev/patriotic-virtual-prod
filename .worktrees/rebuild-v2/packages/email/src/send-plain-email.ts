import {
  sendSendGridPlainEmail,
  type SendGridDispatchResult,
  type SendGridPlainEmailClient,
} from './sendgrid';
import { resolveDefaultSenderConfig } from './templates';

export interface SendPlainEmailInput {
  toEmail: string;
  subject: string;
  text: string;
  html?: string;
  customArgs?: Record<string, string>;
}

export interface SendPlainEmailOptions {
  apiKey?: string;
  client?: SendGridPlainEmailClient;
  env?: Record<string, string | undefined>;
}

export const sendPlainEmail = async (
  input: SendPlainEmailInput,
  options: SendPlainEmailOptions = {},
): Promise<SendGridDispatchResult> => {
  const sender = resolveDefaultSenderConfig(options.env ?? process.env);

  return sendSendGridPlainEmail(
    {
      to: input.toEmail,
      fromEmail: sender.fromEmail,
      replyTo: sender.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      customArgs: input.customArgs,
    },
    {
      apiKey: options.apiKey,
      client: options.client,
    },
  );
};
