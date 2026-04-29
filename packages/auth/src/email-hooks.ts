import { sendTemplateEmail } from '@workspace/email/send-template-email';
import type { SendGridDispatchResult } from '@workspace/email/sendgrid';
import type { EmailTemplateKey } from '@workspace/email/templates';

export interface CreatedAuthUser {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}

export interface WelcomeEmailResult {
  sent: boolean;
  templateKey?: EmailTemplateKey;
  providerMessageId?: string;
  error?: string;
}

export type WelcomeEmailSender = (input: {
  templateKey: EmailTemplateKey;
  toEmail: string;
  templateData: Record<string, unknown>;
  customArgs: Record<string, string>;
}) => Promise<SendGridDispatchResult>;

export const selectWelcomeTemplate = (
  user: CreatedAuthUser,
): EmailTemplateKey => {
  const role = user.role?.toLowerCase() ?? '';

  if (['admin', 'staff', 'provider', 'superadmin'].includes(role)) {
    return 'staff_welcome';
  }

  return 'patient_welcome';
};

export const buildWelcomeTemplateData = (
  user: CreatedAuthUser,
): Record<string, unknown> => ({
  email: user.email ?? '',
  name: user.name?.trim() || user.email || 'there',
  loginUrl: process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? '',
  supportEmail:
    process.env.SENDGRID_DEFAULT_REPLY_TO_EMAIL ??
    'support@patriotictelehealth.com',
});

export const sendWelcomeEmailForCreatedUser = async (
  user: CreatedAuthUser,
  options: {
    sender?: WelcomeEmailSender;
    failOnError?: boolean;
  } = {},
): Promise<WelcomeEmailResult> => {
  const toEmail = user.email?.trim();
  const templateKey = selectWelcomeTemplate(user);

  if (!toEmail) {
    return {
      sent: false,
      templateKey,
      error: 'User email is missing.',
    };
  }

  try {
    const sender = (options.sender ?? sendTemplateEmail) as any;
    const result = await sender({
      templateKey,
      toEmail,
      templateData: buildWelcomeTemplateData(user),
      customArgs: user.id ? { userId: user.id } : {},
    });

    return {
      sent: true,
      templateKey,
      providerMessageId: result.providerMessageId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (options.failOnError) {
      throw error;
    }

    console.warn('Welcome email failed after user creation', {
      userId: user.id,
      templateKey,
      error: message,
    });

    return {
      sent: false,
      templateKey,
      error: message,
    };
  }
};
