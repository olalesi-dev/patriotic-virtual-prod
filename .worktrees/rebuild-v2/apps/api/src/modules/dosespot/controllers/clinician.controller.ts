import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { dosespotConfig, generateSSOUrl } from '@workspace/dosespot/utils';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { DoseSpotClinicianService } from '../clinician.service';
import { ForbiddenException } from '../../../utils/errors';

const clinicianService = new DoseSpotClinicianService(db);

export const clinicianController = new Elysia({ prefix: '/clinician' })
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
        signingClinicianId = Number(dosespotConfig.userId);
        onBehalfOfUserId = Number(targetClinicianId);
      } else if (currentUserProvider?.doseSpotClinicianId) {
        signingClinicianId = Number(currentUserProvider.doseSpotClinicianId);
      } else if (isAdmin) {
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
    '/readiness',
    async ({ user }) => {
      const readiness = await clinicianService.getReadiness(user.id);
      return { readiness };
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:sso'],
      detail: { summary: 'Get Clinician Readiness Status', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/registration-status',
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
  .group('/idp', (app) =>
    app
      .post(
        '/start',
        async ({ user, body }) => {
          return await clinicianService.startIdp(user.id, body);
        },
        {
          isSignIn: true,
          requirePermissions: ['dosespot:sso'],
          body: t.Any(),
          detail: { summary: 'Start Clinician IDP', tags: ['DoseSpot'] },
        },
      )
      .post(
        '/answers',
        async ({ user, body }) => {
          return await clinicianService.submitIdpAnswers(user.id, body);
        },
        {
          isSignIn: true,
          requirePermissions: ['dosespot:sso'],
          body: t.Any(),
          detail: { summary: 'Submit Clinician IDP Answers', tags: ['DoseSpot'] },
        },
      )
      .post(
        '/otp',
        async ({ user, body }) => {
          return await clinicianService.submitIdpOtp(user.id, body);
        },
        {
          isSignIn: true,
          requirePermissions: ['dosespot:sso'],
          body: t.Any(),
          detail: { summary: 'Submit Clinician IDP OTP', tags: ['DoseSpot'] },
        },
      )
      .post(
        '/init',
        async ({ user }) => {
          return await clinicianService.initIdp(user.id);
        },
        {
          isSignIn: true,
          requirePermissions: ['dosespot:sso'],
          detail: { summary: 'Initialize Clinician IDP', tags: ['DoseSpot'] },
        },
      ),
  )
  .group('/legal-agreements', (app) =>
    app
      .get(
        '/',
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
        '/accept',
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
      ),
  );
