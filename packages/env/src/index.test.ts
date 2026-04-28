import { describe, expect, it } from 'bun:test';
import { Value } from '@sinclair/typebox/value';
import { EnvSchema } from './index';

describe('EnvSchema', () => {
  it('validates valid environment variables', () => {
    const env = {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      PORT: '4000',
      CORS_ORIGIN: 'http://localhost:3000',
      NODE_ENV: 'development',
      VOUCHED_PRIVATE_KEY: 'vouched_private',
      VOUCHED_SIGNATURE_KEY: 'vouched_signature',
    };

    expect(Value.Check(EnvSchema, env)).toBe(true);
  });

  it('fails if DATABASE_URL is missing', () => {
    const env = {
      PORT: '4000',
      NODE_ENV: 'development',
    };

    expect(Value.Check(EnvSchema, env)).toBe(false);
  });

  it('allows VOUCHED keys to be optional', () => {
    const env = {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    };

    expect(Value.Check(EnvSchema, env)).toBe(true);
  });
});
