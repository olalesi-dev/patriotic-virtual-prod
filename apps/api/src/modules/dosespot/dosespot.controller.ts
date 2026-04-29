import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { dosespotConfig, generateSSOUrl } from '@workspace/dosespot';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq } from 'drizzle-orm';
import { ensurePatientSynced } from './dosespot.service';
import { DoseSpotWebhookService } from './webhook.service';
import { DoseSpotClinicianService } from './clinician.service';
import { DoseSpotWorkflowService } from './workflow.service';
import {
  NotificationProducers,
  NotificationService,
} from '@workspace/notifications';
import { NotificationQueue } from '@workspace/queue';
import { ForbiddenException } from '../../utils/errors';

const queue = new NotificationQueue();
const notificationService = new NotificationService(db, queue);
const producers = new NotificationProducers(db, notificationService);
const webhookService = new DoseSpotWebhookService(db, producers);
const clinicianService = new DoseSpotClinicianService(db);
const workflowService = new DoseSpotWorkflowService(db);

export const dosespotController = new Elysia({
  prefix: '/dosespot',
})
  .use(authMacro)
  .get(
    '/sso-url',
    async ({ user, query }) => {
      const {
        clinicianId: targetClinicianId,
        patientId,
        encounterId,
        refillsErrors,
      } = query;

      // 1. Resolve the signing user (the person actually clicking the button)
      const [currentUserProvider] = await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.userId, user.id))
        .limit(1);

      let signingClinicianId: number;
      let onBehalfOfUserId: number | undefined;

      const isAdmin =
        user.role === 'Admin' ||
        user.role === 'SuperAdmin' ||
        user.role === 'Staff';

      if (isAdmin && targetClinicianId) {
        // Admin proxying for a specific clinician
        signingClinicianId = Number(dosespotConfig.userId); // Use system user as signer
        onBehalfOfUserId = Number(targetClinicianId);
      } else if (currentUserProvider?.doseSpotClinicianId) {
        // Provider logging in as themselves
        signingClinicianId = Number(currentUserProvider.doseSpotClinicianId);
      } else if (isAdmin) {
        // Admin logging in as system user (standard dashboard view)
        signingClinicianId = Number(dosespotConfig.userId);
      } else {
        throw new ForbiddenException(
          'User not registered with DoseSpot. Contact admin.',
        );
      }

      const url = generateSSOUrl({
        clinicianDoseSpotId: signingClinicianId,
        onBehalfOfUserId,
        patientDoseSpotId: patientId ? Number(patientId) : undefined,
        encounterId: encounterId as string | undefined,
        refillsErrors: refillsErrors === 'true',
      });

      return { url };
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      query: t.Object({
        clinicianId: t.Optional(t.String()),
        patientId: t.Optional(t.String()),
        encounterId: t.Optional(t.String()),
        refillsErrors: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Generate DoseSpot SSO URL (supports proxying)',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/clinician/readiness',
    async ({ user }) => {
      const readiness = await clinicianService.getReadiness(user.id);
      return { readiness };
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: {
        summary: 'Get Clinician Readiness Status',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/clinicians/registration-status',
    async ({ user }) => {
      return await clinicianService.fetchRegistrationStatus(user.id);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: {
        summary: 'Get Clinician Registration Status',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/clinicians/idp/start',
    async ({ user, body }) => {
      return await clinicianService.startIdp(user.id, body);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Any(),
      detail: {
        summary: 'Start Clinician IDP',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/clinicians/idp/answers',
    async ({ user, body }) => {
      return await clinicianService.submitIdpAnswers(user.id, body);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Any(),
      detail: {
        summary: 'Submit Clinician IDP Answers',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/clinicians/idp/otp',
    async ({ user, body }) => {
      return await clinicianService.submitIdpOtp(user.id, body);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Any(),
      detail: {
        summary: 'Submit Clinician IDP OTP',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/clinician/legal-agreements',
    async ({ user }) => {
      return await clinicianService.fetchLegalAgreements(user.id);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: {
        summary: 'Fetch Clinician Legal Agreements',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/clinician/legal-agreements/accept',
    async ({ user, body }) => {
      return await clinicianService.acceptLegalAgreement(
        user.id,
        body.agreementId,
      );
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      body: t.Object({
        agreementId: t.String(),
      }),
      detail: {
        summary: 'Accept Clinician Legal Agreement',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/clinician/idp/init',
    async ({ user }) => {
      return await clinicianService.initIdp(user.id);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: {
        summary: 'Initialize Clinician IDP',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/patients/:id/medication-history',
    async ({ params: { id }, user }) => {
      return await workflowService.getMedicationHistory(user.id, id);
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: 'Fetch Patient Medication History',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/patients/:id/medication-history/consent',
    async ({ params: { id }, body, user }) => {
      return await workflowService.setMedicationHistoryConsent(
        user.id,
        id,
        body.consent,
      );
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        consent: t.Boolean(),
      }),
      detail: {
        summary: 'Set Medication History Consent',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/patients/:id/prescriptions',
    async ({ params: { id }, user }) => {
      return await workflowService.getPrescriptionSummary(user.id, id);
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: 'Fetch Patient Prescription Summary',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/queues/refills',
    async ({ user }) => {
      return await workflowService.getPendingRefillsQueue(user.id);
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      detail: {
        summary: 'Fetch Pending Refills Queue',
        tags: ['DoseSpot'],
      },
    },
  )
  .get(
    '/queues/rx-changes',
    async ({ user }) => {
      return await workflowService.getPendingRxChangesQueue(user.id);
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      detail: {
        summary: 'Fetch Pending Rx Changes Queue',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/patients/:id/sync',
    async ({ params: { id }, user }) => {
      // Get current provider's dosespot id for 'onBehalfOf'
      const [provider] = await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.userId, user.id))
        .limit(1);

      const clinicianId = provider?.doseSpotClinicianId
        ? Number(provider.doseSpotClinicianId)
        : undefined;

      return await ensurePatientSynced(id, clinicianId);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:patients:sync'],
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: 'Sync Patient to DoseSpot',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/webhooks',
    async ({ body, headers, set }) => {
      const authHeader = headers['authorization'];
      if (!webhookService.verifySignature(authHeader)) {
        set.status = 401;
        return { error: 'Invalid DoseSpot webhook secret' };
      }

      const result = await webhookService.ingestWebhook(
        body as Record<string, any>,
        headers as any,
      );

      // Trigger background processing
      setImmediate(() => {
        void webhookService.processEvent(result.id).catch((err) => {
          console.error(`DoseSpot webhook processing failed: ${result.id}`, err);
        });
      });

      set.status = 202;
      return { success: true, eventId: result.id };
    },
    {
      detail: {
        summary: 'DoseSpot Inbound Webhook',
        tags: ['DoseSpot'],
      },
    },
  );
