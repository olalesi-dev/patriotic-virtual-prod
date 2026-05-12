import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
import { setupApp } from './setup';
import { healthController } from './modules/health/health.controller';
import { authController } from './modules/auth/auth.controller';
import { adminAuthController } from './modules/auth/admin-auth.controller';
import { mfaController } from './modules/auth/mfa.controller';
import { stepUpController } from './modules/auth/step-up.controller';
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
import { dashboardAppointmentsController } from './modules/dashboard/appointments.controller';
import { supportController } from './modules/support/support.controller';
import { aiController } from './modules/ai/ai.controller';
import { protocolsController } from './modules/protocols/protocols.controller';
import { servicesController } from './modules/services/services.controller';
import { ordersController } from './modules/orders/orders.controller';
import { socialsController } from './modules/socials/socials.controller';
import { crmController } from './modules/crm/crm.controller';
import { shopController } from './modules/shop/shop.controller';
import { telehealthController } from './modules/telehealth/telehealth.controller';
import { phoneVerificationController } from './modules/phone-verification/phone-verification.controller';
import { telnyxController } from './modules/telnyx/telnyx.controller';
import { emergencyAccessController } from './modules/emergency-access/emergency-access.controller';
import { delegatedAccessController } from './modules/delegated-access/delegated-access.controller';
import { secureMessagesController } from './modules/messages/messages.controller';
import { documentsController } from './modules/documents/documents.controller';
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
      .use(adminAuthController)
      .use(mfaController)
      .use(stepUpController)
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
      .use(dashboardAppointmentsController)
      .use(supportController)
      .use(aiController)
      .use(protocolsController)
      .use(servicesController)
      .use(ordersController)
      .use(socialsController)
      .use(crmController)
      .use(shopController)
      .use(telehealthController)
      .use(emergencyAccessController)
      .use(delegatedAccessController)
      .use(secureMessagesController)
      .use(documentsController)
      .use(phoneVerificationController)
      .use(telnyxController),
  )
  .group('/api/v1', (app) => app.use(dosespotController));

if (import.meta.main) {
  app.listen({
    port: Number(env.PORT) || 3000,
    cluster: env.API_CLUSTER_MODE ? env.WORKER_COUNT || true : false,
  } as any);

  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}${
      env.API_CLUSTER_MODE ? ` (Cluster Mode enabled)` : ''
    }`,
  );
}
