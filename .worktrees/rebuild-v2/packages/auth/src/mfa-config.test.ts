import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_EMAIL_OTP_ALLOWED_ATTEMPTS,
  DEFAULT_EMAIL_OTP_EXPIRES_SECONDS,
  DEFAULT_MAGIC_LINK_ALLOWED_ATTEMPTS,
  DEFAULT_MAGIC_LINK_EXPIRES_SECONDS,
  DEFAULT_MFA_BACKUP_CODE_COUNT,
  DEFAULT_MFA_BACKUP_CODE_LENGTH,
  DEFAULT_MFA_TRUST_DEVICE_SECONDS,
  DEFAULT_PASSKEY_RP_NAME,
  DEFAULT_SMS_OTP_ALLOWED_ATTEMPTS,
  DEFAULT_SMS_OTP_EXPIRES_SECONDS,
  DEFAULT_TOTP_DIGITS,
  DEFAULT_TOTP_ISSUER,
  DEFAULT_TOTP_PERIOD_SECONDS,
  buildEmailOtpPluginOptions,
  buildMagicLinkPluginOptions,
  buildPasskeyPluginOptions,
  buildPhoneNumberPluginOptions,
  buildTwoFactorPluginOptions,
  parsePositiveInteger,
  resolvePasskeyOrigin,
  resolvePasskeyRpId,
  resolveMfaTrustDeviceSeconds,
  resolveTotpIssuer,
} from './mfa-config';

describe('MFA configuration', () => {
  it('uses HIPAA-oriented defaults for TOTP and trusted devices', () => {
    expect(resolveTotpIssuer(undefined)).toBe(DEFAULT_TOTP_ISSUER);
    expect(resolveMfaTrustDeviceSeconds(undefined)).toBe(
      DEFAULT_MFA_TRUST_DEVICE_SECONDS,
    );

    expect(buildTwoFactorPluginOptions({})).toEqual({
      issuer: DEFAULT_TOTP_ISSUER,
      trustDeviceMaxAge: DEFAULT_MFA_TRUST_DEVICE_SECONDS,
      skipVerificationOnEnable: false,
      totpOptions: {
        digits: DEFAULT_TOTP_DIGITS,
        period: DEFAULT_TOTP_PERIOD_SECONDS,
      },
      backupCodeOptions: {
        amount: DEFAULT_MFA_BACKUP_CODE_COUNT,
        length: DEFAULT_MFA_BACKUP_CODE_LENGTH,
        storeBackupCodes: 'encrypted',
      },
      otpOptions: undefined,
    });
  });

  it('accepts explicit issuer and trust-device lifetime overrides', () => {
    expect(
      buildTwoFactorPluginOptions({
        totpIssuer: 'Clinical Portal',
        trustDeviceSeconds: '600',
      }),
    ).toEqual({
      issuer: 'Clinical Portal',
      trustDeviceMaxAge: 600,
      skipVerificationOnEnable: false,
      totpOptions: {
        digits: 6,
        period: 30,
      },
      backupCodeOptions: {
        amount: DEFAULT_MFA_BACKUP_CODE_COUNT,
        length: DEFAULT_MFA_BACKUP_CODE_LENGTH,
        storeBackupCodes: 'encrypted',
      },
      otpOptions: undefined,
    });
  });

  it('builds email OTP, magic link, and SMS OTP options safely', () => {
    const sendEmailOtp = async () => {};
    const sendMagicLink = async () => {};
    const sendSmsOtp = async () => {};

    expect(
      buildEmailOtpPluginOptions({ sendVerificationOTP: sendEmailOtp }),
    ).toMatchObject({
      expiresIn: DEFAULT_EMAIL_OTP_EXPIRES_SECONDS,
      allowedAttempts: DEFAULT_EMAIL_OTP_ALLOWED_ATTEMPTS,
      otpLength: 6,
      storeOTP: 'hashed',
      disableSignUp: true,
      sendVerificationOTP: sendEmailOtp,
    });
    expect(buildMagicLinkPluginOptions({ sendMagicLink })).toMatchObject({
      expiresIn: DEFAULT_MAGIC_LINK_EXPIRES_SECONDS,
      allowedAttempts: DEFAULT_MAGIC_LINK_ALLOWED_ATTEMPTS,
      storeToken: 'hashed',
      disableSignUp: true,
      sendMagicLink,
    });
    expect(
      buildPhoneNumberPluginOptions({
        sendOTP: sendSmsOtp,
        sendPasswordResetOTP: sendSmsOtp,
        phoneNumberValidator: () => true,
      }),
    ).toMatchObject({
      expiresIn: DEFAULT_SMS_OTP_EXPIRES_SECONDS,
      allowedAttempts: DEFAULT_SMS_OTP_ALLOWED_ATTEMPTS,
      otpLength: 6,
      requireVerification: true,
      sendOTP: sendSmsOtp,
      sendPasswordResetOTP: sendSmsOtp,
    });
  });

  it('rejects unsafe numeric values instead of weakening MFA policy', () => {
    expect(parsePositiveInteger('0', 123)).toBe(123);
    expect(parsePositiveInteger('-1', 123)).toBe(123);
    expect(parsePositiveInteger('1.5', 123)).toBe(123);
    expect(parsePositiveInteger('not-a-number', 123)).toBe(123);
  });

  it('builds passkey options from explicit or derived platform identity', () => {
    expect(
      buildPasskeyPluginOptions({
        rpName: 'Clinical Portal',
        rpId: 'auth.example.test',
        origin: 'https://auth.example.test/',
      }),
    ).toMatchObject({
      rpName: 'Clinical Portal',
      rpID: 'auth.example.test',
      origin: 'https://auth.example.test',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      registration: {
        requireSession: true,
        extensions: { credProps: true },
      },
      authentication: {
        extensions: { credProps: true },
      },
    });

    expect(
      buildPasskeyPluginOptions({
        baseUrl: 'http://localhost:48903',
      }),
    ).toMatchObject({
      rpName: DEFAULT_PASSKEY_RP_NAME,
      rpID: 'localhost',
      origin: 'http://localhost:48903',
    });
    expect(resolvePasskeyRpId({ baseUrl: 'not a url' })).toBeUndefined();
    expect(resolvePasskeyOrigin('https://example.test///')).toBe(
      'https://example.test',
    );
  });
});
