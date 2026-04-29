import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { ensurePatientSynced } from '../dosespot.service';
import { DoseSpotWorkflowService } from '../workflow.service';

const workflowService = new DoseSpotWorkflowService(db);

export const patientWorkflowController = new Elysia({ prefix: '/patients' })
  .use(authMacro)
  .get(
    '/:id/medication-history',
    async ({ params: { id }, user }) => {
      return await workflowService.getMedicationHistory(user.id, id);
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Fetch Patient Medication History', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/:id/medication-history/consent',
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
      params: t.Object({ id: t.String() }),
      body: t.Object({ consent: t.Boolean() }),
      detail: { summary: 'Set Medication History Consent', tags: ['DoseSpot'] },
    },
  )
  .get(
    '/:id/prescriptions',
    async ({ params: { id }, user }) => {
      return await workflowService.getPrescriptionSummary(user.id, id);
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Fetch Patient Prescription Summary', tags: ['DoseSpot'] },
    },
  )
  .post(
    '/:id/sync',
    async ({ params: { id }, user }) => {
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
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Sync Patient to DoseSpot', tags: ['DoseSpot'] },
    },
  );
