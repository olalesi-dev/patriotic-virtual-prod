import { describe, expect, it } from 'bun:test';
import { parseVouchedWebhookBody } from './parser';

describe('parseVouchedWebhookBody', () => {
  it('parses valid Vouched webhook JSON', () => {
    expect(
      parseVouchedWebhookBody(
        JSON.stringify({ id: 'job_123', status: 'completed' }),
      ),
    ).toEqual({
      id: 'job_123',
      status: 'completed',
    });
  });

  it('rejects invalid webhook JSON', () => {
    expect(() => parseVouchedWebhookBody('{')).toThrow(
      'Invalid Vouched webhook payload',
    );
  });

  it('rejects webhook JSON without required fields', () => {
    expect(() => parseVouchedWebhookBody(JSON.stringify({ id: 'job_123' }))).toThrow(
      'Invalid Vouched webhook payload',
    );
  });
});
