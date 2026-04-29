export const emailTemplateKeys = ['patient_welcome', 'staff_welcome'] as const;

export type EmailTemplateKey = (typeof emailTemplateKeys)[number];

export interface EmailTemplateConfig {
  envKey: string;
  defaultFromEmail: string;
  defaultReplyToEmail: string;
}

export const emailTemplateConfig: Record<EmailTemplateKey, EmailTemplateConfig> =
  {
    patient_welcome: {
      envKey: 'SENDGRID_TEMPLATE_PATIENT_WELCOME',
      defaultFromEmail: 'hello@patriotictelehealth.com',
      defaultReplyToEmail: 'hello@patriotictelehealth.com',
    },
    staff_welcome: {
      envKey: 'SENDGRID_TEMPLATE_STAFF_WELCOME',
      defaultFromEmail: 'hello@patriotictelehealth.com',
      defaultReplyToEmail: 'hello@patriotictelehealth.com',
    },
  };

export const resolveTemplateId = (
  templateKey: EmailTemplateKey,
  source: Record<string, string | undefined> = process.env,
): string => {
  const config = emailTemplateConfig[templateKey];
  const templateId = source[config.envKey]?.trim();

  if (!templateId) {
    throw new Error(
      `Missing SendGrid template id for ${templateKey} (${config.envKey}).`,
    );
  }

  return templateId;
};

export const resolveSenderConfig = (
  templateKey: EmailTemplateKey,
  source: Record<string, string | undefined> = process.env,
): { fromEmail: string; replyTo: string } => {
  const config = emailTemplateConfig[templateKey];
  const fromEmail =
    source.SENDGRID_DEFAULT_FROM_EMAIL?.trim() || config.defaultFromEmail;
  const replyTo =
    source.SENDGRID_DEFAULT_REPLY_TO_EMAIL?.trim() ||
    config.defaultReplyToEmail;

  return {
    fromEmail,
    replyTo,
  };
};
