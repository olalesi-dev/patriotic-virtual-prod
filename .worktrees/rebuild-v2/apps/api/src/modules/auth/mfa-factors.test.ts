import { describe, expect, it } from 'bun:test';
import { buildMfaFactorSummary, mfaFactorCapabilities } from './mfa-factors';

describe('MFA factor summary', () => {
  it('reports an unenrolled user without exposing setup secrets', () => {
    const summary = buildMfaFactorSummary(null);

    expect(summary.totp.enrolled).toBe(false);
    expect(summary.totp.verified).toBe(false);
    expect(summary.backupCodes.enabled).toBe(false);
    expect(summary.trustedDevice.maxAgeSeconds).toBe(60 * 60 * 24 * 14);
    expect(JSON.stringify(summary)).not.toContain('secret');
    expect(JSON.stringify(summary)).not.toContain('backupCodes":"');
  });

  it('does not treat an unverified TOTP setup as active MFA', () => {
    const summary = buildMfaFactorSummary({
      id: 'factor-1',
      verified: false,
      backupCodes: 'encrypted-backup-codes',
    });

    expect(summary.totp.enrolled).toBe(true);
    expect(summary.totp.verified).toBe(false);
    expect(summary.backupCodes.enabled).toBe(false);
  });

  it('marks verified TOTP and backup codes as available without leaking values', () => {
    const summary = buildMfaFactorSummary(
      {
        id: 'factor-1',
        verified: true,
        backupCodes: 'encrypted-backup-codes',
      },
      { trustDeviceMaxAgeSeconds: 1234 },
    );

    expect(summary.totp.enrolled).toBe(true);
    expect(summary.totp.verified).toBe(true);
    expect(summary.backupCodes.enabled).toBe(true);
    expect(summary.trustedDevice.maxAgeSeconds).toBe(1234);
    expect(JSON.stringify(summary)).not.toContain('encrypted-backup-codes');
  });

  it('reports all supported factors as available', () => {
    expect(mfaFactorCapabilities.map((factor) => factor.id)).toEqual([
      'totp',
      'backup_code',
      'email_otp',
      'sms_otp',
      'magic_link',
      'passkey',
    ]);
    expect(
      mfaFactorCapabilities.filter((factor) => factor.status === 'available')
        .length,
    ).toBe(6);
    expect(
      mfaFactorCapabilities.find((factor) => factor.id === 'passkey')?.status,
    ).toBe('available');
  });
});
