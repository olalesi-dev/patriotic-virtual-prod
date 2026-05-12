export const DEFAULT_TOTP_ISSUER = 'Patriotic Virtual Telehealth';
export const DEFAULT_MFA_TRUST_DEVICE_SECONDS = 60 * 60 * 24 * 14;
export const DEFAULT_TOTP_DIGITS = 6 as const;
export const DEFAULT_TOTP_PERIOD_SECONDS = 30;
export const DEFAULT_MFA_BACKUP_CODE_COUNT = 16;
export const DEFAULT_MFA_BACKUP_CODE_LENGTH = 10;
export const DEFAULT_EMAIL_OTP_EXPIRES_SECONDS = 5 * 60;
export const DEFAULT_EMAIL_OTP_ALLOWED_ATTEMPTS = 3;
export const DEFAULT_MAGIC_LINK_EXPIRES_SECONDS = 5 * 60;
export const DEFAULT_MAGIC_LINK_ALLOWED_ATTEMPTS = 1;
export const DEFAULT_SMS_OTP_EXPIRES_SECONDS = 5 * 60;
export const DEFAULT_SMS_OTP_ALLOWED_ATTEMPTS = 3;
export const DEFAULT_PASSKEY_RP_NAME = 'Patriotic Virtual Telehealth';

export const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
) => {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const resolveTotpIssuer = (value: string | undefined) => {
  const issuer = value?.trim();
  return issuer || DEFAULT_TOTP_ISSUER;
};

export const resolveMfaTrustDeviceSeconds = (value: string | undefined) =>
  parsePositiveInteger(value, DEFAULT_MFA_TRUST_DEVICE_SECONDS);

export const buildTwoFactorPluginOptions = (input: {
  totpIssuer?: string;
  trustDeviceSeconds?: string;
  sendTwoFactorOtp?: (data: {
    user: { id: string; email: string };
    otp: string;
  }) => Promise<void>;
}) =>
  ({
    issuer: resolveTotpIssuer(input.totpIssuer),
    trustDeviceMaxAge: resolveMfaTrustDeviceSeconds(input.trustDeviceSeconds),
    skipVerificationOnEnable: false,
    totpOptions: {
      digits: DEFAULT_TOTP_DIGITS,
      period: DEFAULT_TOTP_PERIOD_SECONDS,
    },
    backupCodeOptions: {
      amount: DEFAULT_MFA_BACKUP_CODE_COUNT,
      length: DEFAULT_MFA_BACKUP_CODE_LENGTH,
      storeBackupCodes: 'encrypted' as const,
    },
    otpOptions: input.sendTwoFactorOtp
      ? {
          digits: DEFAULT_TOTP_DIGITS,
          period: 5,
          allowedAttempts: 5,
          storeOTP: 'hashed' as const,
          sendOTP: input.sendTwoFactorOtp,
        }
      : undefined,
  }) as const;

export const buildEmailOtpPluginOptions = (input: {
  expiresSeconds?: string;
  allowedAttempts?: string;
  sendVerificationOTP: (data: {
    email: string;
    otp: string;
    type: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';
  }) => Promise<void>;
}) =>
  ({
    expiresIn: parsePositiveInteger(
      input.expiresSeconds,
      DEFAULT_EMAIL_OTP_EXPIRES_SECONDS,
    ),
    allowedAttempts: parsePositiveInteger(
      input.allowedAttempts,
      DEFAULT_EMAIL_OTP_ALLOWED_ATTEMPTS,
    ),
    otpLength: DEFAULT_TOTP_DIGITS,
    storeOTP: 'hashed' as const,
    disableSignUp: true,
    sendVerificationOTP: input.sendVerificationOTP,
  }) as const;

export const buildMagicLinkPluginOptions = (input: {
  expiresSeconds?: string;
  allowedAttempts?: string;
  sendMagicLink: (data: { email: string; url: string }) => Promise<void>;
}) =>
  ({
    expiresIn: parsePositiveInteger(
      input.expiresSeconds,
      DEFAULT_MAGIC_LINK_EXPIRES_SECONDS,
    ),
    allowedAttempts: parsePositiveInteger(
      input.allowedAttempts,
      DEFAULT_MAGIC_LINK_ALLOWED_ATTEMPTS,
    ),
    storeToken: 'hashed' as const,
    disableSignUp: true,
    sendMagicLink: input.sendMagicLink,
  }) as const;

export const buildPhoneNumberPluginOptions = (input: {
  expiresSeconds?: string;
  allowedAttempts?: string;
  sendOTP: (data: { phoneNumber: string; code: string }) => Promise<void>;
  sendPasswordResetOTP: (data: {
    phoneNumber: string;
    code: string;
  }) => Promise<void>;
  phoneNumberValidator: (phoneNumber: string) => boolean;
}) =>
  ({
    expiresIn: parsePositiveInteger(
      input.expiresSeconds,
      DEFAULT_SMS_OTP_EXPIRES_SECONDS,
    ),
    allowedAttempts: parsePositiveInteger(
      input.allowedAttempts,
      DEFAULT_SMS_OTP_ALLOWED_ATTEMPTS,
    ),
    otpLength: DEFAULT_TOTP_DIGITS,
    requireVerification: true,
    sendOTP: input.sendOTP,
    sendPasswordResetOTP: input.sendPasswordResetOTP,
    phoneNumberValidator: input.phoneNumberValidator,
    schema: {
      user: {
        fields: {
          phoneNumber: 'phone',
          phoneNumberVerified: 'phoneVerified',
        },
      },
    },
  }) as const;

export const resolvePasskeyOrigin = (value: string | undefined) => {
  const origin = value?.trim();
  return origin ? origin.replace(/\/+$/, '') : undefined;
};

export const resolvePasskeyRpId = (input: {
  rpId?: string;
  origin?: string;
  baseUrl?: string;
}) => {
  const configured = input.rpId?.trim();
  if (configured) {
    return configured;
  }

  const source = input.origin?.trim() || input.baseUrl?.trim();
  if (!source) {
    return undefined;
  }

  try {
    return new URL(source).hostname;
  } catch {
    return undefined;
  }
};

export const buildPasskeyPluginOptions = (input: {
  rpName?: string;
  rpId?: string;
  origin?: string;
  baseUrl?: string;
}) =>
  ({
    rpName: input.rpName?.trim() || DEFAULT_PASSKEY_RP_NAME,
    rpID: resolvePasskeyRpId(input),
    origin: resolvePasskeyOrigin(input.origin || input.baseUrl),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    registration: {
      requireSession: true,
      extensions: {
        credProps: true,
      },
    },
    authentication: {
      extensions: {
        credProps: true,
      },
    },
  }) as const;
