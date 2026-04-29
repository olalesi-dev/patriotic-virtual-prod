import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
import { setupApp } from './setup';
import { healthController } from './modules/health/health.controller';
import { authController } from './modules/auth/auth.controller';
import { vouchedController } from './modules/vouched/vouched.controller';
import { auditController } from './modules/audit/audit.controller';
import { notificationController } from './modules/notifications/notification.controller';
import { paymentsController } from './modules/payments/payments.controller';
import { dosespotController } from './modules/dosespot/dosespot.controller';
import { consultationsController } from './modules/consultations/consultations.controller';
import { clinicalController } from './modules/clinical/clinical.controller';
import { adminController } from './modules/admin/admin.controller';
import { profileController } from './modules/profile/profile.controller';
import { availabilityController } from './modules/availability/availability.controller';
import { analyticsController } from './modules/analytics/analytics.controller';
import { supportController } from './modules/support/support.controller';
import { aiController } from './modules/ai/ai.controller';
import { protocolsController } from './modules/protocols/protocols.controller';
import { servicesController } from './modules/services/services.controller';
import { ordersController } from './modules/orders/orders.controller';
import { socialsController } from './modules/socials/socials.controller';
import { crmController } from './modules/crm/crm.controller';
import { shopController } from './modules/shop/shop.controller';
import { telehealthController } from './modules/telehealth/telehealth.controller';
import { env } from '@workspace/env';

export const app = new Elysia()
  .use(setupApp)
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
      .use(auditController)
      .use(notificationController)
      .use(paymentsController)
      .use(dosespotController)
      .use(consultationsController)
      .use(clinicalController)
      .use(adminController)
      .use(profileController)
      .use(availabilityController)
      .use(analyticsController)
      .use(supportController)
      .use(aiController)
      .use(protocolsController)
      .use(servicesController)
      .use(ordersController)
      .use(socialsController)
      .use(crmController)
      .use(shopController)
      .use(telehealthController),
  );

if (import.meta.main) {
  app.listen({
    port: Number(env.PORT) || 3000,
    cluster: env.API_CLUSTER_MODE ? (env.WORKER_COUNT || true) : false,
  } as any);

  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}${
      env.API_CLUSTER_MODE ? ` (Cluster Mode enabled)` : ''
    }`,
  );
}

