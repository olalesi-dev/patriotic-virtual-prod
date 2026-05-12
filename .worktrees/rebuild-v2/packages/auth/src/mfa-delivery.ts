import { sendPlainEmail } from '@workspace/email/send-plain-email';
import {
  normalizeSmsPhoneNumber,
  sendTelnyxSms,
} from '@workspace/notifications/channels/telnyx';

type EmailOtpType =
  | 'sign-in'
  | 'email-verification'
  | 'forget-password'
  | 'change-email';

const appName = 'Patriotic Virtual Telehealth';

const authEmailSubject = (type: EmailOtpType) => {
  switch (type) {
    case 'sign-in':
      return `${appName} sign-in code`;
    case 'email-verification':
      return `${appName} email verification code`;
    case 'forget-password':
      return `${appName} password reset code`;
    case 'change-email':
      return `${appName} email change code`;
  }
};

export const buildAuthOtpEmail = (input: {
  otp: string;
  type: EmailOtpType | 'two-factor';
}) => {
  const purpose =
    input.type === 'two-factor'
      ? 'two-factor authentication'
      : input.type.replaceAll('-', ' ');
  const subject =
    input.type === 'two-factor'
      ? `${appName} two-factor code`
      : authEmailSubject(input.type);
  const text = [
    `Your ${purpose} code is ${input.otp}.`,
    'This code expires shortly. Do not share it with anyone.',
    `${appName} staff will never ask for this code.`,
  ].join('\n');

  return {
    subject,
    text,
    html: `<p>Your ${purpose} code is <strong>${input.otp}</strong>.</p><p>This code expires shortly. Do not share it with anyone.</p><p>${appName} staff will never ask for this code.</p>`,
  };
};

export const buildMagicLinkEmail = (input: { url: string }) => ({
  subject: `${appName} sign-in link`,
  text: [
    `Use this link to sign in to ${appName}:`,
    input.url,
    'This link expires shortly and can only be used once.',
  ].join('\n'),
  html: `<p>Use this link to sign in to ${appName}:</p><p><a href="${input.url}">Sign in</a></p><p>This link expires shortly and can only be used once.</p>`,
});

export const sendAuthEmailOtp = async (input: {
  email: string;
  otp: string;
  type: EmailOtpType;
}) => {
  const message = buildAuthOtpEmail({ otp: input.otp, type: input.type });
  await sendPlainEmail({
    toEmail: input.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    customArgs: {
      category: 'auth_email_otp',
      type: input.type,
    },
  });
};

export const sendTwoFactorEmailOtp = async (input: {
  user: { id: string; email: string };
  otp: string;
}) => {
  const message = buildAuthOtpEmail({ otp: input.otp, type: 'two-factor' });
  await sendPlainEmail({
    toEmail: input.user.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    customArgs: {
      category: 'auth_two_factor_email_otp',
      userId: input.user.id,
    },
  });
};

export const sendMagicLinkEmail = async (input: {
  email: string;
  url: string;
}) => {
  const message = buildMagicLinkEmail({ url: input.url });
  await sendPlainEmail({
    toEmail: input.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    customArgs: {
      category: 'auth_magic_link',
    },
  });
};

export const sendAuthSmsOtp = async (input: {
  phoneNumber: string;
  code: string;
}) => {
  const to = normalizeSmsPhoneNumber(input.phoneNumber);
  await sendTelnyxSms({
    recipientId: to,
    to,
    text: `${appName} code: ${input.code}. Do not share this code.`,
  });
};

export const isLikelyE164PhoneNumber = (phoneNumber: string) =>
  /^\+[1-9]\d{7,14}$/.test(normalizeSmsPhoneNumber(phoneNumber));
