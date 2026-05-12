import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { ensurePatientSynced } from '../dosespot.service';
import { DoseSpotWorkflowService } from '../workflow.service';
import {
  logDelegatedAccessAuditEvent,
  resolveDoseSpotOnBehalfOf,
} from '../../delegated-access/service';

const workflowService = new DoseSpotWorkflowService(db);

const resolveWorkflowClinicianId = async ({
  user,
  session,
  request,
  ip,
}: {
  user: { id: string; organizationId?: string | null };
  session?: { role?: string | null } | null;
  request?: Request;
  ip?: string;
}) => {
  const delegation = user.organizationId
    ? await resolveDoseSpotOnBehalfOf({
        actorUserId: user.id,
        organizationId: user.organizationId,
      })
    : null;

  if (delegation) {
    await logDelegatedAccessAuditEvent({
      actor: user,
      actorRole: session?.role,
      delegationId: delegation.delegationId,
      targetProviderId: delegation.targetProviderId,
      event: 'delegated_access_dosespot_on_behalf',
      request,
      ipAddress: ip,
      organizationId: user.organizationId,
      details: {
        clinicianIdResolved: true,
        scopes: delegation.scopes,
      },
    });

    return delegation.clinicianId;
  }

  const [provider] = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.userId, user.id))
    .limit(1);

  return provider?.doseSpotClinicianId
    ? Number(provider.doseSpotClinicianId)
    : undefined;
};

export const patientWorkflowController = new Elysia({ prefix: '/patients' })
  .use(authMacro)
  .get(
    '/:id/medication-history',
    async ({ params: { id }, user, session, request, ip }) => await workflowService.getMedicationHistory(user.id, id, {
        onBehalfOfClinicianId: await resolveWorkflowClinicianId({
          user,
          session,
          request,
          ip,
        }),
      }),
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({ id: t.String() }),
      detail: {
        summary: 'Fetch Patient Medication History',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/:id/medication-history/consent',
    async ({ params: { id }, body, user, session, request, ip }) => await workflowService.setMedicationHistoryConsent(
        user.id,
        id,
        body.consent,
        {
          onBehalfOfClinicianId: await resolveWorkflowClinicianId({
            user,
            session,
            request,
            ip,
          }),
        },
      ),
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({ consent: t.Boolean() }),
      detail: { summary: 'Set Medication History Consent', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/:id/prescriptions',
    async ({ params: { id }, user, session, request, ip }) => await workflowService.getPrescriptionSummary(user.id, id, {
        onBehalfOfClinicianId: await resolveWorkflowClinicianId({
          user,
          session,
          request,
          ip,
        }),
      }),
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({ id: t.String() }),
      detail: {
        summary: 'Fetch Patient Prescription Summary',
        tags: ['DoseSpot'],
      },
    },
  )
  .post(
    '/:id/sync',
    async ({ params: { id }, user, session, request, ip }) => {
      const clinicianId = await resolveWorkflowClinicianId({
        user,
        session,
        request,
        ip,
      });
      return await ensurePatientSynced(id, clinicianId);
    },
    {
      isSignIn: true,
      requirePermissions: ['dosespot:patients:sync'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Sync Patient to DoseSpot', tags: ['DoseSpot'] },
    },
  );
