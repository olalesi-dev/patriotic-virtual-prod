import { describe, it, expect } from 'bun:test';
import type { Static } from 'elysia';
import type { VouchedWebhookPayload } from './model';
import {
  verifyVouchedSignature,
  deriveVerificationStatus
} from './service';
describe('Vouched Service', () => {
  describe('verifyVouchedSignature', () => {
    it('should return false if keys are missing', () => {
      // Assuming env is mocked or empty in test
      expect(verifyVouchedSignature('body', 'sig')).toBe(false);
    });
  });

  describe('deriveVerificationStatus', () => {
    it('should return verified for success with no warnings', () => {
      const payload = {
        id: '123',
        status: 'completed',
        result: { success: true, warnings: false }
      } as unknown as Static<typeof VouchedWebhookPayload>;
      expect(deriveVerificationStatus(payload)).toBe('verified');
    });

    it('should return review_required for success with warnings', () => {
      const payload = {
        id: '123',
        status: 'completed',
        result: { success: true, warnings: true }
      } as unknown as Static<typeof VouchedWebhookPayload>;
      expect(deriveVerificationStatus(payload)).toBe('review_required');
    });

    it('should return pending for active status', () => {
      const payload = {
        id: '123',
        status: 'active',
        result: { success: false, warnings: false }
      } as unknown as Static<typeof VouchedWebhookPayload>;
      expect(deriveVerificationStatus(payload)).toBe('pending');
    });

    it('should return failed for other cases', () => {
      const payload = {
        id: '123',
        status: 'completed',
        result: { success: false, warnings: false }
      } as unknown as Static<typeof VouchedWebhookPayload>;
      expect(deriveVerificationStatus(payload)).toBe('failed');
    });
  });
});
