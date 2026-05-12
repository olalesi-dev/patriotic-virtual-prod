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
      AUTH_LOGIN_LOCKOUT_MAX_ATTEMPTS: '5',
      AUTH_LOGIN_LOCKOUT_SECONDS: '900',
      AUTH_REQUIRE_STAFF_MFA: 'true',
      AUTH_TOTP_ISSUER: 'Patriotic Virtual Telehealth',
      AUTH_MFA_TRUST_DEVICE_SECONDS: '1209600',
      AUTH_EMAIL_OTP_EXPIRES_SECONDS: '300',
      AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS: '3',
      AUTH_MAGIC_LINK_EXPIRES_SECONDS: '300',
      AUTH_MAGIC_LINK_ALLOWED_ATTEMPTS: '1',
      AUTH_SMS_OTP_EXPIRES_SECONDS: '300',
      AUTH_SMS_OTP_ALLOWED_ATTEMPTS: '3',
      AUTH_PASSKEY_RP_NAME: 'Patriotic Virtual Telehealth',
      AUTH_PASSKEY_RP_ID: 'localhost',
      AUTH_PASSKEY_ORIGIN: 'http://localhost:48903',
      AUTH_BREAK_GLASS_DURATION_SECONDS: '3600',
      AUTH_DELEGATED_ACCESS_DURATION_SECONDS: '3600',
      AUDIT_EXPORT_ENABLED: 'false',
      AUDIT_EXPORT_ENDPOINT: 'https://audit.example.test/ingest',
      AUDIT_EXPORT_TIMEOUT_MS: '5000',
      AUDIT_EXPORT_BATCH_SIZE: '100',
      AUDIT_LOG_RETENTION_DAYS: '2190',
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
