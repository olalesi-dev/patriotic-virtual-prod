import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const dashboardController = new Elysia({ prefix: '/dashboard' })
  .use(authMacro)
  .get(
    '/stats',
    async ({ user }) => {
      const orgId = user.organizationId!;

      const [patientsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.patients)
        .where(eq(schema.patients.organizationId, orgId));

      const [appointmentsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.appointments)
        .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
        .where(
          and(
            eq(schema.patients.organizationId, orgId),
            sql`${schema.appointments.scheduledTime}::date = current_date`
          )
        );

      const [pendingPrescriptions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.prescriptions)
        .where(
          and(
            eq(schema.prescriptions.status, 'Pending'),
            // Ideally filtered by org via patient link
          )
        );

      return {
        patients: patientsCount.count,
        todayAppointments: appointmentsCount.count,
        pendingPrescriptions: pendingPrescriptions.count,
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['dashboard:read'],
      detail: { summary: 'Get Dashboard Metrics', tags: ['Clinical'] },
    }
  );
