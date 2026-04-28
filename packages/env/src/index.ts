import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export const EnvSchema = Type.Object({
  DATABASE_URL: Type.String({ minLength: 1 }),
  PORT: Type.Optional(Type.String({ default: '3000' })),
  CORS_ORIGIN: Type.Optional(Type.String({ default: 'http://localhost:52305' })),
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
