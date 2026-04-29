import {
  resolveSenderConfig,
  resolveTemplateId,
  type EmailTemplateKey,
} from './templates';
import {
  sendSendGridTemplate,
  type SendGridClient,
  type SendGridDispatchResult,
} from './sendgrid';

export interface SendTemplateEmailInput {
  templateKey: EmailTemplateKey;
  toEmail: string;
  templateData: Record<string, unknown>;
  customArgs?: Record<string, string>;
}

export interface SendTemplateEmailOptions {
  apiKey?: string;
  client?: SendGridClient;
  env?: Record<string, string | undefined>;
}

export const sendTemplateEmail = async (
  input: SendTemplateEmailInput,
  options: SendTemplateEmailOptions = {},
): Promise<SendGridDispatchResult> => {
  const source = options.env ?? process.env;
  const sender = resolveSenderConfig(input.templateKey, source);

  return sendSendGridTemplate(
    {
      to: input.toEmail,
      fromEmail: sender.fromEmail,
      replyTo: sender.replyTo,
      templateId: resolveTemplateId(input.templateKey, source),
      templateData: input.templateData,
      customArgs: input.customArgs,
    },
    {
      apiKey: options.apiKey,
      client: options.client,
    },
  );
};
