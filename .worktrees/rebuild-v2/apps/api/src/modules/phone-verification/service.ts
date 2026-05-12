import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import * as schema from '@workspace/db/schema';
import { sendTelnyxSms } from '@workspace/notifications/index';

const verificationTtlMs = 300_000;
const maxFailedAttempts = 5;
const resendWindowMs = 60_000;

type UserRow = typeof schema.users.$inferSelect;
type PatientRow = typeof schema.patients.$inferSelect;

interface PhoneVerificationContext {
  user: UserRow;
  patient?: PatientRow;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
};

export const normalizePhoneNumber = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {return `+1${digits}`;}
  if (digits.length === 11 && digits.startsWith('1')) {return `+${digits}`;}
  if (digits.length >= 8 && digits.length <= 15) {return `+${digits}`;}
  throw new Error(
    'Phone number must include a valid country code or be a valid 10-digit US number.',
  );
};

const samePhoneNumber = (first: string, second: string): boolean => {
  const normalizeDigits = (value: string) =>
    value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return normalizeDigits(first) === normalizeDigits(second);
};

const hashVerificationCode = (phoneNumber: string, code: string): string =>
  createHash('sha256').update(`${phoneNumber}:${code}`).digest('hex');

const codesMatch = (
  phoneNumber: string,
  code: string,
  expectedHash: string,
): boolean => {
  const candidate = Buffer.from(hashVerificationCode(phoneNumber, code), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};

const generateVerificationCode = (): string =>
  randomInt(10_000, 100_000).toString();

const readPhoneVerification = (
  context: PhoneVerificationContext,
): Record<string, unknown> => {
  const userVerification = asRecord(context.user.phoneVerification);
  if (Object.keys(userVerification).length > 0) {
    return userVerification;
  }

  return asRecord(context.patient?.phoneVerification);
};

const loadContext = async (userId: string): Promise<PhoneVerificationContext> => {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('Authenticated user record was not found.');
  }

  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.userId, userId))
    .limit(1);

  return {
    user,
    patient,
  };
};

const updatePhoneVerification = async (
  context: PhoneVerificationContext,
  patch: {
    phone: string;
    phoneVerified: boolean;
    phoneVerification: Record<string, unknown>;
  },
): Promise<void> => {
  const now = new Date();

  await db
    .update(schema.users)
    .set({
      phone: patch.phone,
      phoneVerified: patch.phoneVerified,
      phoneVerification: patch.phoneVerification,
      updatedAt: now,
    })
    .where(eq(schema.users.id, context.user.id));

  if (context.patient) {
    await db
      .update(schema.patients)
      .set({
        phone: patch.phone,
        phoneVerified: patch.phoneVerified,
        phoneVerification: patch.phoneVerification,
        updatedAt: now,
      })
      .where(eq(schema.patients.id, context.patient.id));
  }
};

const enforceResendRateLimit = (
  verification: Record<string, unknown>,
): void => {
  const requestedAt = asDate(verification.requestedAt);
  if (requestedAt && Date.now() - requestedAt.getTime() < resendWindowMs) {
    throw new Error('Only one SMS per user is allowed per minute.');
  }
};

export const startPhoneVerification = async (
  userId: string,
  phoneNumber?: string,
) => {
  const context = await loadContext(userId);
  const selectedPhone =
    phoneNumber?.trim() || context.user.phone || context.patient?.phone || '';

  if (!selectedPhone) {
    throw new Error('Phone number is required before verification can start.');
  }

  const normalizedPhone = normalizePhoneNumber(selectedPhone);
  const currentVerification = readPhoneVerification(context);
  enforceResendRateLimit(currentVerification);

  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + verificationTtlMs);
  const smsResult = await sendTelnyxSms({
    recipientId: userId,
    to: normalizedPhone,
    text: `Your Patriotic Telehealth verification code is ${verificationCode}. This code expires in 5 minutes.`,
  });

  const verification = {
    status: 'pending',
    phone: normalizedPhone,
    codeHash: hashVerificationCode(normalizedPhone, verificationCode),
    verificationId: smsResult.providerMessageId,
    provider: 'telnyx_sms',
    requestedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    failedAttempts: 0,
  };

  await updatePhoneVerification(context, {
    phone: normalizedPhone,
    phoneVerified: false,
    phoneVerification: verification,
  });

  return {
    phone_number: normalizedPhone,
    id: smsResult.providerMessageId,
    type: 'sms',
    status: 'pending',
    timeout_secs: 300,
    record_type: 'verification',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    delivery_status: null,
  };
};

export const verifyPhoneCode = async (
  userId: string,
  phoneNumber: string,
  code: string,
) => {
  const context = await loadContext(userId);
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const verification = readPhoneVerification(context);
  const verificationPhone =
    typeof verification.phone === 'string' ? verification.phone.trim() : '';
  const codeHash =
    typeof verification.codeHash === 'string' ? verification.codeHash.trim() : '';
  const failedAttempts =
    typeof verification.failedAttempts === 'number'
      ? verification.failedAttempts
      : 0;
  const expiresAt = asDate(verification.expiresAt);

  if (!verificationPhone || !samePhoneNumber(verificationPhone, normalizedPhone)) {
    throw new Error('No pending verification was found for this phone number.');
  }

  if (!codeHash) {
    throw new Error('No pending verification code was found. Please request a new code.');
  }

  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new Error('Verification code has expired. Please request a new code.');
  }

  if (failedAttempts >= maxFailedAttempts) {
    throw new Error('Maximum verification attempts exceeded. Please request a new code.');
  }

  if (!codesMatch(normalizedPhone, code, codeHash)) {
    await updatePhoneVerification(context, {
      phone: normalizedPhone,
      phoneVerified: false,
      phoneVerification: {
        ...verification,
        failedAttempts: failedAttempts + 1,
        updatedAt: new Date().toISOString(),
      },
    });
    throw new Error('Verification code was not accepted.');
  }

  await updatePhoneVerification(context, {
    phone: normalizedPhone,
    phoneVerified: true,
    phoneVerification: {
      ...verification,
      status: 'verified',
      phone: normalizedPhone,
      verifiedAt: new Date().toISOString(),
      lastResponseCode: 'accepted',
      codeHash: null,
    },
  });

  return {
    phone_number: normalizedPhone,
    response_code: 'accepted',
  };
};
