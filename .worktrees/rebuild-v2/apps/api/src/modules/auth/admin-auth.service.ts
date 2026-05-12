import type { SendPlainEmailInput } from '@workspace/email/send-plain-email';

export const ADMIN_AUTH_ROLES = ['Admin', 'SuperAdmin'] as const;
export type AdminAuthRole = (typeof ADMIN_AUTH_ROLES)[number];

export const ADMIN_MFA_BACKUP_CODE_COUNT = 16;
export const ADMIN_TRUST_DEVICE_DAYS = 14;
export const ADMIN_TRUST_DEVICE_SECONDS =
  60 * 60 * 24 * ADMIN_TRUST_DEVICE_DAYS;

const temporaryPasswordAlphabet =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*?';

export const normalizeAdminEmail = (email: string) =>
  email.trim().toLowerCase();

export const normalizeAdminRole = (role: string): AdminAuthRole | undefined => {
  const normalized = role
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '');
  if (normalized === 'admin') {
    return 'Admin';
  }
  if (normalized === 'superadmin') {
    return 'SuperAdmin';
  }
  return undefined;
};

export const isSuperAdminRole = (role?: string | null) =>
  normalizeAdminRole(role ?? '') === 'SuperAdmin';

export const createTemporaryPassword = (length = 18, bytes?: Uint8Array) => {
  const entropy = bytes ?? crypto.getRandomValues(new Uint8Array(length));
  return [...entropy]
    .map(
      (byte) =>
        temporaryPasswordAlphabet[byte % temporaryPasswordAlphabet.length],
    )
    .join('');
};

export const hashAdminPassword = async (password: string) =>
  Bun.password.hash(password, 'argon2id');

export const buildAdminDefaultPasswordEmail = (input: {
  email: string;
  name: string;
  temporaryPassword: string;
  appUrl?: string;
}): SendPlainEmailInput => {
  const loginUrl = input.appUrl
    ? `${input.appUrl.replace(/\/+$/, '')}/admin`
    : '/admin';
  return {
    toEmail: input.email,
    subject: 'Your Patriotic Admin account is ready',
    text: [
      `Hello ${input.name},`,
      '',
      'A super-admin created your Patriotic Admin account.',
      `Temporary password: ${input.temporaryPassword}`,
      `Sign in: ${loginUrl}`,
      '',
      'You must change this password and complete MFA before dashboard access is allowed.',
    ].join('\n'),
    html: [
      `<p>Hello ${input.name},</p>`,
      '<p>A super-admin created your Patriotic Admin account.</p>',
      `<p><strong>Temporary password:</strong> ${input.temporaryPassword}</p>`,
      `<p><a href="${loginUrl}">Sign in to Patriotic Admin</a></p>`,
      '<p>You must change this password and complete MFA before dashboard access is allowed.</p>',
    ].join(''),
    customArgs: {
      category: 'admin_default_password',
    },
  };
};

export const buildAdminResetApprovedEmail = (input: {
  email: string;
  name: string;
  temporaryPassword: string;
  appUrl?: string;
}): SendPlainEmailInput => {
  const loginUrl = input.appUrl
    ? `${input.appUrl.replace(/\/+$/, '')}/admin`
    : '/admin';
  return {
    toEmail: input.email,
    subject: 'Your Patriotic Admin password reset was approved',
    text: [
      `Hello ${input.name},`,
      '',
      'A super-admin approved your password reset request.',
      `Temporary password: ${input.temporaryPassword}`,
      `Sign in: ${loginUrl}`,
      '',
      'You must change this password after signing in.',
    ].join('\n'),
    html: [
      `<p>Hello ${input.name},</p>`,
      '<p>A super-admin approved your password reset request.</p>',
      `<p><strong>Temporary password:</strong> ${input.temporaryPassword}</p>`,
      `<p><a href="${loginUrl}">Sign in to Patriotic Admin</a></p>`,
      '<p>You must change this password after signing in.</p>',
    ].join(''),
    customArgs: {
      category: 'admin_password_reset_approved',
    },
  };
};

export const assertPendingResetRequest = (status: string) =>
  status === 'pending';
