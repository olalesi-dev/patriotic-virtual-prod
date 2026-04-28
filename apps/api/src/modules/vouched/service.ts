/* eslint-disable unicorn/no-null */
import { and, eq } from 'drizzle-orm';
import { env } from '@workspace/env';
import * as schema from '@workspace/db';
import { db } from '../../db';
import {
  deriveVerificationStatus,
  extractVouchedCorrelation,
  extractVouchedWarningMessage,
  type VouchedPayload,
} from './helpers';

export interface FetchVouchedJobOptions {
  apiKey?: string;
  fetcher?: (url: string, init?: RequestInit) => Promise<Response>;
}

export const fetchVouchedJob = async (
  jobId: string,
  options: FetchVouchedJobOptions = {},
): Promise<VouchedPayload> => {
  const apiKey = options.apiKey ?? env.VOUCHED_PRIVATE_KEY;
  if (!apiKey) {
    throw new Error('VOUCHED_PRIVATE_KEY is not configured');
  }

  const response = await (options.fetcher ?? fetch)(
    `https://verify.vouched.id/api/jobs/${encodeURIComponent(jobId)}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Vouched job ${jobId}: ${response.status}`);
  }

  const payload = (await response.json()) as VouchedPayload;
  if (!payload.id || !payload.status) {
    throw new Error('Vouched job response is missing id or status');
  }

  return payload;
};

export const processVouchedJob = async (payload: VouchedPayload) => {
  const { patientId, appointmentId } = extractVouchedCorrelation(payload);
  const status = deriveVerificationStatus(payload);
  const verifiedAt = status === 'verified' ? new Date() : null;
  const warningMessage = extractVouchedWarningMessage(payload);
  const failureReason =
    status === 'verified'
      ? null
      : warningMessage ?? 'Identity verification did not complete successfully.';

  if (!patientId) {
    throw new Error('Missing patientId in Vouched payload properties');
  }

  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(schema.identityVerifications)
      .where(
        and(
          eq(schema.identityVerifications.provider, 'vouched'),
          eq(schema.identityVerifications.jobId, payload.id),
        ),
      )
      .limit(1);

    const [verification] = existing
      ? await tx
          .update(schema.identityVerifications)
          .set({
            patientId,
            appointmentId,
            status,
            verifiedAt,
            failureReason,
          })
          .where(eq(schema.identityVerifications.id, existing.id))
          .returning()
      : await tx
          .insert(schema.identityVerifications)
          .values({
            patientId,
            appointmentId,
            jobId: payload.id,
            status,
            provider: 'vouched',
            verifiedAt,
            failureReason,
          })
          .returning();

    await tx
      .update(schema.patients)
      .set({
        isIdentityVerified: status === 'verified',
        latestVerificationId: verification.id,
      })
      .where(eq(schema.patients.id, patientId));

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
