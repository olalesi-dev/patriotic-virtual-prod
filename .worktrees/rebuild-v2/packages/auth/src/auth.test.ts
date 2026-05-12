import { expect, test, describe } from 'bun:test';
import { auth } from './auth.js';

describe('Better Auth Server Configuration', () => {
  test('should export auth instance', () => {
    expect(auth).toBeDefined();
    expect(typeof auth.api).toBe('object');
  });

  test('should have supported MFA and sign-in plugins configured', () => {
    expect(
      auth.options.plugins?.map((plugin: { id?: string }) => plugin.id),
    ).toEqual([
      'email-otp',
      'magic-link',
      'phone-number',
      'two-factor',
      'passkey',
      'admin',
    ]);
  });

  test('should configure TOTP setup and trusted-device MFA policy', () => {
    const twoFactorPlugin = auth.options.plugins?.find(
      (plugin: { id?: string }) => plugin.id === 'two-factor',
    ) as
      | {
          options?: {
            issuer?: string;
            trustDeviceMaxAge?: number;
            skipVerificationOnEnable?: boolean;
            totpOptions?: { digits?: number; period?: number };
            backupCodeOptions?: { amount?: number; length?: number };
            otpOptions?: Record<string, unknown>;
          };
        }
      | undefined;

    expect(twoFactorPlugin?.options?.issuer).toBe(
      'Patriotic Virtual Telehealth',
    );
    expect(twoFactorPlugin?.options?.trustDeviceMaxAge).toBe(60 * 60 * 24 * 14);
    expect(twoFactorPlugin?.options?.skipVerificationOnEnable).toBe(false);
    expect(twoFactorPlugin?.options?.totpOptions).toEqual({
      digits: 6,
      period: 30,
    });
    expect(twoFactorPlugin?.options?.backupCodeOptions).toMatchObject({
      amount: 16,
      length: 10,
    });
    expect(twoFactorPlugin?.options?.otpOptions).toMatchObject({
      digits: 6,
      period: 5,
      allowedAttempts: 5,
      storeOTP: 'hashed',
    });
  });

  test('should configure passwordless email, magic link, and SMS OTP policy', () => {
    const plugins = auth.options.plugins ?? [];
    const emailOtpPlugin = plugins.find(
      (plugin: { id?: string }) => plugin.id === 'email-otp',
    ) as { options?: Record<string, unknown> } | undefined;
    const magicLinkPlugin = plugins.find(
      (plugin: { id?: string }) => plugin.id === 'magic-link',
    ) as { options?: Record<string, unknown> } | undefined;
    const phoneNumberPlugin = plugins.find(
      (plugin: { id?: string }) => plugin.id === 'phone-number',
    ) as { options?: Record<string, unknown> } | undefined;

    expect(emailOtpPlugin?.options).toMatchObject({
      expiresIn: 300,
      allowedAttempts: 3,
      otpLength: 6,
      storeOTP: 'hashed',
      disableSignUp: true,
    });
    expect(magicLinkPlugin?.options).toMatchObject({
      expiresIn: 300,
      allowedAttempts: 1,
      storeToken: 'hashed',
      disableSignUp: true,
    });
    expect(phoneNumberPlugin?.options).toMatchObject({
      expiresIn: 300,
      allowedAttempts: 3,
      otpLength: 6,
      requireVerification: true,
    });
  });

  test('should configure passkeys with platform identity settings', () => {
    const passkeyPlugin = auth.options.plugins?.find(
      (plugin: { id?: string }) => plugin.id === 'passkey',
    ) as { options?: Record<string, unknown> } | undefined;

    expect(passkeyPlugin?.options).toMatchObject({
      rpName: 'Patriotic Virtual Telehealth',
      rpID: 'patriotic-virtual-emr.web.app',
      origin: 'https://patriotic-virtual-emr.web.app',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      registration: {
        requireSession: true,
      },
    });
  });

  test('should configure bounded session lifetime and freshness', () => {
    expect(auth.options.session?.expiresIn).toBe(60 * 60 * 8);
    expect(auth.options.session?.updateAge).toBe(60 * 15);
    expect(auth.options.session?.freshAge).toBe(60 * 5);
  });
});
