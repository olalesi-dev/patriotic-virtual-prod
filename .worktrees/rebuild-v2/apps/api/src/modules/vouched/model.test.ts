import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'bun:test';
import { VouchedWebhookPayload } from './model';

describe('VouchedWebhookPayload schema', () => {
  const schema = VouchedWebhookPayload;
  const check = Value.Check;

  it('validates a complete payload', () => {
    const payload = {
      id: 'test-id',
      status: 'completed',
      request: {
        properties: [
          { name: 'document', value: 'front' },
        ],
        parameters: {
          internalId: 'patient:pat_123',
        },
      },
      result: {
        success: true,
        warnings: false,
        error: 'none',
      },
      errors: [],
    };
    expect(check(schema, payload)).toBe(true);
  });

  it('fails if id is missing', () => {
    const payload = {
      status: 'completed',
    };
    expect(check(schema, payload)).toBe(false);
  });

  it('fails if status is missing', () => {
    const payload = {
      id: 'test-id',
    };
    expect(check(schema, payload)).toBe(false);
  });

  it('allows missing optional fields', () => {
    const payload = {
      id: 'test-id',
      status: 'completed',
    };
    expect(check(schema, payload)).toBe(true);
  });

  it('validates error as object', () => {
    const payload = {
      id: 'test-id',
      status: 'failed',
      result: {
        error: {
          code: '123',
          message: 'failed to read',
        },
      },
    };
    expect(check(schema, payload)).toBe(true);
  });
});
