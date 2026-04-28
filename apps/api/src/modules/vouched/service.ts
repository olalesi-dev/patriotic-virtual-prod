import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@workspace/env';
import { db } from '../../db';
import * as schema from '@workspace/db';
import type { Static } from 'elysia';
import type { VouchedWebhookPayload } from './model';
import { eq } from 'drizzle-orm';

export type VouchedStatus = 'verified' | 'failed' | 'review_required' | 'pending';

export const verifyVouchedSignature = (rawBody: string, signatureHeader: string): boolean => {
  const key = env.VOUCHED_SIGNATURE_KEY || env.VOUCHED_PRIVATE_KEY || '';
  if (!key) return false;

  const hmac = createHmac('sha1', key);
  hmac.update(rawBody, 'utf8');
  const digest = hmac.digest('base64');

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
};

const extractProperty = (
  properties: { name: string; value: string }[] | undefined | null,
  name: string
): string | null => {
  if (!properties) return null;
  const prop = properties.find((p) => p.name === name);
  return prop?.value || null;
};

export const deriveVerificationStatus = (
  payload: Static<typeof VouchedWebhookPayload>
): VouchedStatus => {
  const isSuccessful = payload.result?.success ?? false;
  const hasWarnings = payload.result?.warnings ?? false;
  const status = payload.status.toLowerCase();

  if (isSuccessful && !hasWarnings) return 'verified';
  if (isSuccessful && hasWarnings) return 'review_required';
  if (status === 'active') return 'pending';
  return 'failed';
};

export const processVouchedJob = async (
  payload: Static<typeof VouchedWebhookPayload>
) => {
  const patientId = extractProperty(payload.request?.properties, 'patientId');
  const appointmentId = extractProperty(payload.request?.properties, 'appointmentId');
  const status = deriveVerificationStatus(payload);

  if (!patientId) {
    throw new Error('Missing patientId in Vouched payload properties');
  }

  return await db.transaction(async (tx) => {
    const [verification] = await tx
      .insert(schema.identityVerifications)
      .values({
        patientId,
        appointmentId,
        jobId: payload.id,
        status,
        provider: 'vouched',
        verifiedAt: status === 'verified' ? new Date() : null,
        failureReason: typeof payload.result?.error === 'string'
          ? payload.result.error
          : JSON.stringify(payload.result?.error)
      })
      .returning();

    if (status === 'verified') {
      await tx
        .update(schema.patients)
        .set({
          isIdentityVerified: true,
          latestVerificationId: verification.id,
        })
        .where(eq(schema.patients.id, patientId));
    }

    if (appointmentId) {
      await tx
        .update(schema.appointments)
        .set({
          verificationId: verification.id,
        })
        .where(eq(schema.appointments.id, appointmentId));
    }

    return verification;
  });
};
