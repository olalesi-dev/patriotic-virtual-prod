import { describe, it, expect } from 'bun:test';
import { VouchedWebhookPayload } from './model';
import { Value } from '@sinclair/typebox/value';

describe('VouchedWebhookPayload schema', () => {
  const schema = VouchedWebhookPayload;

  it('validates a complete payload', () => {
    const payload = {
      id: 'test-id',
      status: 'completed',
      request: {
        properties: [
          { name: 'document', value: 'front' }
        ]
      },
      result: {
        success: true,
        warnings: false,
        error: 'none'
      },
      errors: []
    };
    expect(Value.Check(schema, payload)).toBe(true);
  });

  it('fails if id is missing', () => {
    const payload = {
      status: 'completed'
    };
    expect(Value.Check(schema, payload)).toBe(false);
  });

  it('fails if status is missing', () => {
    const payload = {
      id: 'test-id'
    };
    expect(Value.Check(schema, payload)).toBe(false);
  });

  it('allows missing optional fields', () => {
    const payload = {
      id: 'test-id',
      status: 'completed'
    };
    expect(Value.Check(schema, payload)).toBe(true);
  });

  it('validates error as object', () => {
    const payload = {
      id: 'test-id',
      status: 'failed',
      result: {
        error: {
          code: '123',
          message: 'failed to read'
        }
      }
    };
    expect(Value.Check(schema, payload)).toBe(true);
  });
});
