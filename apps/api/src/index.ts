import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
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
import { analyticsController } from './modules/analytics/analytics.controller';
import { aiController } from './modules/ai/ai.controller';
import { protocolsController } from './modules/protocols/protocols.controller';
import { servicesController } from './modules/services/services.controller';
import { ordersController } from './modules/orders/orders.controller';
import { socialsController } from './modules/socials/socials.controller';
import { crmController } from './modules/crm/crm.controller';
import { telehealthController } from './modules/telehealth/telehealth.controller';
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
      .use(auditController)
      .use(notificationController)
      .use(paymentsController)
      .use(dosespotController)
      .use(consultationsController)
      .use(clinicalController)
      .use(adminController)
      .use(profileController)
      .use(analyticsController)
      .use(aiController)
      .use(protocolsController)
      .use(servicesController)
      .use(ordersController)
      .use(socialsController)
      .use(crmController)
      .use(telehealthController),
  )
  .listen(env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
