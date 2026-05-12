import { DEFAULT_MFA_TRUST_DEVICE_SECONDS } from '@workspace/auth/mfa-config';

export interface MfaFactorRecord {
  id?: string | null;
  verified?: boolean | null;
  backupCodes?: string | null;
}

export const mfaFactorCapabilities = [
  {
    id: 'totp',
    label: 'Authenticator app',
    status: 'available',
    setupEndpoint: '/api/auth/two-factor/enable',
    verifyEndpoint: '/api/auth/two-factor/verify-totp',
    qrPayloadField: 'totpURI',
  },
  {
    id: 'backup_code',
    label: 'Backup codes',
    status: 'available',
    generateEndpoint: '/api/auth/two-factor/generate-backup-codes',
    verifyEndpoint: '/api/auth/two-factor/verify-backup-code',
  },
  {
    id: 'email_otp',
    label: 'Email OTP',
    status: 'available',
    sendEndpoint: '/api/auth/email-otp/send-verification-otp',
    signInEndpoint: '/api/auth/sign-in/email-otp',
    twoFactorSendEndpoint: '/api/auth/two-factor/send-otp',
    twoFactorVerifyEndpoint: '/api/auth/two-factor/verify-otp',
  },
  {
    id: 'sms_otp',
    label: 'SMS OTP',
    status: 'available',
    sendEndpoint: '/api/auth/phone-number/send-otp',
    verifyEndpoint: '/api/auth/phone-number/verify',
    signInEndpoint: '/api/auth/sign-in/phone-number',
  },
  {
    id: 'magic_link',
    label: 'Magic link',
    status: 'available',
    signInEndpoint: '/api/auth/sign-in/magic-link',
    verifyEndpoint: '/api/auth/magic-link/verify',
  },
  {
    id: 'passkey',
    label: 'Passkey',
    status: 'available',
    addClientAction: 'authClient.passkey.addPasskey',
    signInClientAction: 'authClient.signIn.passkey',
    generateRegistrationEndpoint: '/api/auth/passkey/generate-register-options',
    verifyRegistrationEndpoint: '/api/auth/passkey/verify-registration',
    generateAuthenticationEndpoint:
      '/api/auth/passkey/generate-authenticate-options',
    verifyAuthenticationEndpoint: '/api/auth/passkey/verify-authentication',
    listEndpoint: '/api/auth/passkey/list-user-passkeys',
    deleteEndpoint: '/api/auth/passkey/delete-passkey',
    updateEndpoint: '/api/auth/passkey/update-passkey',
    crossDeviceQr: true,
  },
] as const;

export const buildMfaFactorSummary = (
  record: MfaFactorRecord | null | undefined,
  options: {
    trustDeviceMaxAgeSeconds?: number;
  } = {},
) => {
  const enrolled = Boolean(record?.id);
  const verified = record?.verified === true;
  const hasBackupCodes = Boolean(record?.backupCodes && verified);

  return {
    totp: {
      enrolled,
      verified,
      setupEndpoint: '/api/auth/two-factor/enable',
      verifyEndpoint: '/api/auth/two-factor/verify-totp',
      qrPayloadField: 'totpURI',
    },
    backupCodes: {
      enabled: hasBackupCodes,
      generateEndpoint: '/api/auth/two-factor/generate-backup-codes',
      verifyEndpoint: '/api/auth/two-factor/verify-backup-code',
    },
    trustedDevice: {
      enabled: true,
      maxAgeSeconds:
        options.trustDeviceMaxAgeSeconds ?? DEFAULT_MFA_TRUST_DEVICE_SECONDS,
      verifyBodyField: 'trustDevice',
    },
    supportedFactors: mfaFactorCapabilities,
  };
};
