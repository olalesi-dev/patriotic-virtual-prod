import { describe, expect, it } from 'bun:test';
import {
  buildAuthOtpEmail,
  buildMagicLinkEmail,
  isLikelyE164PhoneNumber,
} from './mfa-delivery';

describe('MFA delivery helpers', () => {
  it('builds PHI-free OTP email bodies', () => {
    const message = buildAuthOtpEmail({
      otp: '123456',
      type: 'two-factor',
    });

    expect(message.subject).toContain('two-factor code');
    expect(message.text).toContain('123456');
    expect(message.text).toContain('Do not share');
    expect(message.text).not.toContain('patient');
    expect(message.text).not.toContain('appointment');
  });

  it('builds single-use magic link emails without adding PHI', () => {
    const message = buildMagicLinkEmail({
      url: 'https://app.example.test/api/auth/magic-link/verify?token=abc',
    });

    expect(message.subject).toContain('sign-in link');
    expect(message.text).toContain('https://app.example.test');
    expect(message.text).toContain('only be used once');
  });

  it('validates normalized E.164 phone numbers for SMS OTP', () => {
    expect(isLikelyE164PhoneNumber('+15555550100')).toBe(true);
    expect(isLikelyE164PhoneNumber('(555) 555-0100')).toBe(true);
    expect(isLikelyE164PhoneNumber('123')).toBe(false);
  });
});
