/* eslint-disable unicorn/no-null */
import { describe, expect, it } from 'bun:test';
import {
  createVouchedSignature,
  deriveVerificationStatus,
  extractVouchedCorrelation,
  extractVouchedWarningMessage,
  verifyVouchedSignature,
  type VouchedPayload,
} from './helpers';

describe('Vouched helpers', () => {
  describe('verifyVouchedSignature', () => {
    it('returns false if the body or signature is missing', () => {
      expect(verifyVouchedSignature('', 'sig', 'secret')).toBe(false);
      expect(verifyVouchedSignature('body', undefined, 'secret')).toBe(false);
    });

    it('verifies the Vouched HMAC signature', () => {
      const rawBody = JSON.stringify({ id: 'job_123', status: 'completed' });
      const signature = createVouchedSignature(rawBody, 'secret');

      expect(verifyVouchedSignature(rawBody, signature, 'secret')).toBe(true);
      expect(verifyVouchedSignature(rawBody, signature, 'other')).toBe(false);
    });
  });

  describe('deriveVerificationStatus', () => {
    it('returns verified for success with no warnings', () => {
      const payload = {
        id: '123',
        status: 'completed',
        result: { success: true, warnings: false },
      } satisfies VouchedPayload;

      expect(deriveVerificationStatus(payload)).toBe('verified');
    });

    it('returns review_required for success with warnings', () => {
      const payload = {
        id: '123',
        status: 'completed',
        result: { success: true, warnings: true },
      } satisfies VouchedPayload;

      expect(deriveVerificationStatus(payload)).toBe('review_required');
    });

    it('returns pending for active jobs', () => {
      const payload = {
        id: '123',
        status: 'active',
        result: { success: false, warnings: false },
      } satisfies VouchedPayload;

      expect(deriveVerificationStatus(payload)).toBe('pending');
    });

    it('returns failed for unsuccessful completed jobs', () => {
      const payload = {
        id: '123',
        status: 'completed',
        result: { success: false, warnings: false },
      } satisfies VouchedPayload;

      expect(deriveVerificationStatus(payload)).toBe('failed');
    });
  });

  describe('extractVouchedCorrelation', () => {
    it('prefers explicit patient and appointment properties', () => {
      const payload = {
        id: 'job_123',
        status: 'completed',
        request: {
          properties: [
            { name: 'patientId', value: 'pat_123' },
            { name: 'appointmentId', value: 'appt_123' },
            { name: 'uid', value: 'legacy_uid' },
          ],
        },
      } satisfies VouchedPayload;

      expect(extractVouchedCorrelation(payload)).toEqual({
        appointmentId: 'appt_123',
        internalId: null,
        patientId: 'pat_123',
      });
    });

    it('supports old backend uid property names', () => {
      const payload = {
        id: 'job_123',
        status: 'completed',
        request: {
          properties: [{ name: 'firebaseUid', value: 'firebase_uid' }],
        },
      } satisfies VouchedPayload;

      expect(extractVouchedCorrelation(payload).patientId).toBe('firebase_uid');
    });

    it('falls back to patient scoped internal ids from request parameters', () => {
      const payload = {
        id: 'job_123',
        status: 'completed',
        request: {
          parameters: {
            internalId: 'patient:pat_456',
          },
        },
      } satisfies VouchedPayload;

      expect(extractVouchedCorrelation(payload)).toEqual({
        appointmentId: null,
        internalId: 'patient:pat_456',
        patientId: 'pat_456',
      });
    });
  });

  describe('extractVouchedWarningMessage', () => {
    it('reads structured Vouched error messages', () => {
      const payload = {
        id: 'job_123',
        status: 'completed',
        result: {
          success: false,
          error: {
            code: 'document_low_quality',
            message: 'Document image is too blurry',
          },
        },
      } satisfies VouchedPayload;

      expect(extractVouchedWarningMessage(payload)).toBe(
        'Document image is too blurry',
      );
    });
  });
});
