import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import {
  DEFAULT_APP_URL,
  DEFAULT_CORS_ORIGIN,
  DEFAULT_NOTIFICATION_QUEUE_NAME,
  DEFAULT_PORT,
} from './constants';

export const EnvSchema = Type.Object({
  DATABASE_URL: Type.String({ minLength: 1 }),
  PORT: Type.Optional(Type.String({ default: DEFAULT_PORT })),
  CORS_ORIGIN: Type.Optional(Type.String({ default: DEFAULT_CORS_ORIGIN })),
  NODE_ENV: Type.Optional(
    Type.Union(
      [
        Type.Literal('development'),
        Type.Literal('production'),
        Type.Literal('test'),
      ],
      { default: 'development' },
    ),
  ),
  VOUCHED_PRIVATE_KEY: Type.Optional(Type.String()),
  VOUCHED_SIGNATURE_KEY: Type.Optional(Type.String()),
  SENDGRID_API_KEY: Type.Optional(Type.String()),
  SENDGRID_DEFAULT_FROM_EMAIL: Type.Optional(Type.String()),
  SENDGRID_DEFAULT_REPLY_TO_EMAIL: Type.Optional(Type.String()),
  SENDGRID_TEMPLATE_PATIENT_WELCOME: Type.Optional(Type.String()),
  SENDGRID_TEMPLATE_STAFF_WELCOME: Type.Optional(Type.String()),
  EMAIL_DEBUG_LOGS: Type.Optional(Type.String()),
  STRIPE_SECRET_KEY: Type.Optional(Type.String()),
  STRIPE_WEBHOOK_SECRET: Type.Optional(Type.String()),
  GA_PROPERTY_ID: Type.Optional(Type.String()),
  GEMINI_API_KEY: Type.Optional(Type.String()),
  DICOM_BASE_URL: Type.Optional(Type.String()),
  CF_ACCESS_CLIENT_ID: Type.Optional(Type.String()),
  CF_ACCESS_CLIENT_SECRET: Type.Optional(Type.String()),
  APP_URL: Type.Optional(Type.String({ default: DEFAULT_APP_URL })),
  REDIS_URL: Type.Optional(Type.String()),
  DOSESPOT_BASE_URL: Type.Optional(Type.String()),
  DOSESPOT_CLINIC_ID: Type.Optional(Type.String()),
  DOSESPOT_CLINIC_KEY: Type.Optional(Type.String()),
  DOSESPOT_USER_ID: Type.Optional(Type.String()),
  DOSESPOT_SUBSCRIPTION_KEY: Type.Optional(Type.String()),
  DOSESPOT_DEFAULT_CLINICIAN_ID: Type.Optional(Type.String()),
  DOSESPOT_WEBHOOK_SECRET: Type.Optional(Type.String()),
  NOTIFICATION_QUEUE_NAME: Type.Optional(
    Type.String({ default: DEFAULT_NOTIFICATION_QUEUE_NAME }),
  ),
  QUEUE_INLINE_FALLBACK: Type.Optional(Type.String()),
});

export type Env = Static<typeof EnvSchema>;

const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';

if (!skipValidation && !Value.Check(EnvSchema, process.env)) {
  const errors = [...Value.Errors(EnvSchema, process.env)];
  console.error('❌ Invalid environment variables:');
  for (const error of errors) {
    console.error(`  - ${error.path}: ${error.message}`);
  }
  process.exit(1);
}

export const env = Value.Cast(EnvSchema, process.env);
