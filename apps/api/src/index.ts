import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
import { healthController } from './modules/health/health.controller';
import { authController } from './modules/auth/auth.controller';
import { vouchedController } from './modules/vouched/vouched.controller';
import { auditController } from './modules/audit/audit.controller';
import { env } from '@workspace/env';

export const app = new Elysia()
  .use(
    openapi({
      path: '/api/docs',
    }),
  )
  .group('/api', (app) =>
    app
      .use(authController)
      .group('/health', (app) => app.use(healthController))
      .use(vouchedController)
      .use(auditController),
  )
  .listen(env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
