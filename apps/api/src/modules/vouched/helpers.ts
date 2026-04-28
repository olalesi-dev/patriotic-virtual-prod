/* eslint-disable unicorn/no-null */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Static } from 'elysia';
import { env } from '@workspace/env';
import type { VouchedWebhookPayload } from './model';

export type VouchedPayload = Static<typeof VouchedWebhookPayload>;
export type VouchedStatus = 'verified' | 'failed' | 'review_required' | 'pending';

export interface VouchedCorrelation {
  patientId: string | null;
  appointmentId: string | null;
  internalId: string | null;
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const getRequestRecord = (payload: VouchedPayload): Record<string, unknown> =>
  asRecord(payload.request) ?? {};

export const createVouchedSignature = (rawBody: string, key: string): string =>
  createHmac('sha1', key).update(rawBody, 'utf8').digest('base64');

export const verifyVouchedSignature = (
  rawBody: string,
  signatureHeader: string | null | undefined,
  keyOverride?: string,
): boolean => {
  if (!rawBody || !signatureHeader) {
    return false;
  }

  const key = keyOverride ?? env.VOUCHED_SIGNATURE_KEY ?? env.VOUCHED_PRIVATE_KEY;
  if (!key) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(createVouchedSignature(rawBody, key), 'utf8'),
      Buffer.from(signatureHeader, 'utf8'),
    );
  } catch {
    return false;
  }
};

export const extractVouchedPropertyMap = (
  payload: VouchedPayload,
): Record<string, string> => {
  const properties = asArray(getRequestRecord(payload).properties);
  const output: Record<string, string> = {};

  for (const entry of properties) {
    const record = asRecord(entry);
    if (record) {
      const name = asString(record.name);
      const value = asString(record.value);
      if (name && value) {
        output[name] = value;
      }
    }
  }

  return output;
};

export const extractVouchedInternalId = (
  payload: VouchedPayload,
): string | null => {
  const request = getRequestRecord(payload);
  const parameters = asRecord(request.parameters) ?? {};
  const directInternalId = asString(parameters.internalId);
  if (directInternalId) {
    return directInternalId;
  }

  const properties = extractVouchedPropertyMap(payload);
  return properties.internalId ?? null;
};

const extractPatientIdFromInternalId = (
  internalId: string | null,
): string | null => {
  if (!internalId) {
    return null;
  }

  const [scope, patientId] = internalId.split(':');
  if (scope === 'patient' && patientId) {
    return patientId;
  }

  return null;
};

export const extractVouchedCorrelation = (
  payload: VouchedPayload,
): VouchedCorrelation => {
  const properties = extractVouchedPropertyMap(payload);
  const internalId = extractVouchedInternalId(payload);

  return {
    patientId:
      properties.patientId ??
      properties.firebaseUid ??
      properties.uid ??
      properties.userUid ??
      properties.patientUid ??
      extractPatientIdFromInternalId(internalId),
    appointmentId: properties.appointmentId ?? null,
    internalId,
  };
};

export const extractVouchedWarningMessage = (
  payload: VouchedPayload,
): string | null => {
  const error = payload.result?.error;
  if (typeof error === 'string') {
    return asString(error);
  }

  const errorRecord = asRecord(error);
  if (errorRecord) {
    return asString(errorRecord.message) ?? asString(errorRecord.type);
  }

  for (const entry of asArray(payload.errors)) {
    const record = asRecord(entry);
    if (record) {
      const message = asString(record.message) ?? asString(record.type);
      if (message) {
        return message;
      }
    }
  }

  return null;
};

export const deriveVerificationStatus = (
  payload: VouchedPayload,
): VouchedStatus => {
  const isSuccessful = payload.result?.success ?? false;
  const hasWarnings = payload.result?.warnings ?? false;
  const status = payload.status.toLowerCase();

  if (isSuccessful && !hasWarnings) {
    return 'verified';
  }
  if (isSuccessful && hasWarnings) {
    return 'review_required';
  }
  if (status === 'active') {
    return 'pending';
  }
  return 'failed';
};
