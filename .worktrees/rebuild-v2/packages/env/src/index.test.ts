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
      SENDGRID_API_KEY: 'sendgrid_key',
      SENDGRID_DEFAULT_FROM_EMAIL: 'hello@patriotictelehealth.com',
      SENDGRID_DEFAULT_REPLY_TO_EMAIL: 'support@patriotictelehealth.com',
      SENDGRID_TEMPLATE_PATIENT_WELCOME: 'd-patient',
      SENDGRID_TEMPLATE_STAFF_WELCOME: 'd-staff',
      REDIS_URL: 'redis://localhost:6379',
      NOTIFICATION_QUEUE_NAME: 'notifications',
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

  it('allows email and queue settings to be optional', () => {
    const env = {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    };

    expect(Value.Check(EnvSchema, env)).toBe(true);
  });
});
