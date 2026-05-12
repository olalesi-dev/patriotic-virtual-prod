import { describe, expect, it } from 'bun:test';
import {
  ADMIN_MFA_BACKUP_CODE_COUNT,
  ADMIN_TRUST_DEVICE_SECONDS,
  assertPendingResetRequest,
  buildAdminDefaultPasswordEmail,
  buildAdminResetApprovedEmail,
  createTemporaryPassword,
  isSuperAdminRole,
  normalizeAdminEmail,
  normalizeAdminRole,
} from './admin-auth.service';

describe('admin auth service helpers', () => {
  it('normalizes only admin and super-admin roles', () => {
    expect(normalizeAdminRole('admin')).toBe('Admin');
    expect(normalizeAdminRole('SUPER_ADMIN')).toBe('SuperAdmin');
    expect(normalizeAdminRole('super-admin')).toBe('SuperAdmin');
    expect(normalizeAdminRole('provider')).toBeUndefined();
    expect(isSuperAdminRole('SuperAdmin')).toBe(true);
    expect(isSuperAdminRole('Admin')).toBe(false);
  });

  it('normalizes email and generates deterministic temporary passwords in tests', () => {
    expect(normalizeAdminEmail(' Admin@Example.COM ')).toBe(
      'admin@example.com',
    );

    const password = createTemporaryPassword(
      6,
      new Uint8Array([0, 1, 2, 3, 4, 5]),
    );

    expect(password).toHaveLength(6);
    expect(password).toBe('ABCDEF');
  });

  it('uses the admin MFA policy requested by the backend contract', () => {
    expect(ADMIN_MFA_BACKUP_CODE_COUNT).toBe(16);
    expect(ADMIN_TRUST_DEVICE_SECONDS).toBe(60 * 60 * 24 * 14);
  });

  it('builds default-password and approved-reset emails without PHI', () => {
    const defaultEmail = buildAdminDefaultPasswordEmail({
      appUrl: 'https://app.example.test/',
      email: 'admin@example.test',
      name: 'Admin User',
      temporaryPassword: 'TempPassword123!',
    });
    const resetEmail = buildAdminResetApprovedEmail({
      appUrl: 'https://app.example.test',
      email: 'admin@example.test',
      name: 'Admin User',
      temporaryPassword: 'NextPassword123!',
    });

    expect(defaultEmail.toEmail).toBe('admin@example.test');
    expect(defaultEmail.subject).toContain('Admin account');
    expect(defaultEmail.text).toContain('TempPassword123!');
    expect(defaultEmail.text).toContain('complete MFA');
    expect(defaultEmail.customArgs?.category).toBe('admin_default_password');
    expect(resetEmail.subject).toContain('password reset was approved');
    expect(resetEmail.text).toContain('NextPassword123!');
    expect(resetEmail.customArgs?.category).toBe(
      'admin_password_reset_approved',
    );
  });

  it('rejects non-pending reset request decisions', () => {
    expect(assertPendingResetRequest('pending')).toBe(true);
    expect(assertPendingResetRequest('approved')).toBe(false);
  });
});
