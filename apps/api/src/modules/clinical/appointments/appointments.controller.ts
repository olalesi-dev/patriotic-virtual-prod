import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db';
import { eq, and, gte, lte, or, desc } from 'drizzle-orm';

export const appointmentsController = new Elysia({ prefix: '/appointments' })
  .use(authMacro)
  .get(
    '/',
    async ({ query, user }) => {
      const { start, end, status } = query;
      let whereClause = eq(schema.patients.organizationId, user.organizationId!);

      if (start) {
        whereClause = and(whereClause, gte(schema.appointments.scheduledTime, new Date(start))) as any;
      }
      if (end) {
        whereClause = and(whereClause, lte(schema.appointments.scheduledTime, new Date(end))) as any;
      }
      if (status) {
        whereClause = and(whereClause, eq(schema.appointments.status, status)) as any;
      }

      const items = await db
        .select({
          appointment: schema.appointments,
          patient: schema.patients,
          provider: schema.providers,
        })
        .from(schema.appointments)
        .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
        .leftJoin(schema.providers, eq(schema.appointments.providerId, schema.providers.id))
        .where(whereClause)
        .orderBy(schema.appointments.scheduledTime);

      return { items };
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      query: t.Object({
        start: t.Optional(t.String()),
        end: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: { summary: 'List Appointments (Calendar)', tags: ['Clinical'] },
    }
  )
  .get(
    '/waitlist',
    async ({ user }) => {
      const items = await db
        .select({
          consultation: schema.consultations,
          patient: schema.patients,
        })
        .from(schema.consultations)
        .innerJoin(schema.patients, eq(schema.consultations.patientId, schema.patients.id))
        .where(
          and(
            eq(schema.patients.organizationId, user.organizationId!),
            eq(schema.consultations.status, 'waitlist')
          )
        )
        .orderBy(desc(schema.consultations.createdAt));

      return { items };
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      detail: { summary: 'List Patient Waitlist', tags: ['Clinical'] },
    }
  )
  .get(
    '/:id/soap-notes',
    async ({ params: { id } }) => {
      const notes = await db
        .select()
        .from(schema.soapNotes)
        .where(eq(schema.soapNotes.appointmentId, id));
      
      return { notes };
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Get SOAP Notes for Appointment', tags: ['Clinical'] },
    }
  )
  .post(
    '/:id/soap-notes',
    async ({ params: { id }, body, user }) => {
      const [appointment] = await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.id, id))
        .limit(1);
      
      if (!appointment) throw new Error('Appointment not found');

      const [note] = await db
        .insert(schema.soapNotes)
        .values({
          appointmentId: id,
          patientId: appointment.patientId,
          providerId: appointment.providerId!, // Should be validated
          subjective: body.subjective,
          objective: body.objective,
          assessment: body.assessment,
          plan: body.plan,
        })
        .returning();

      return note;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({
        subjective: t.Optional(t.String()),
        objective: t.Optional(t.String()),
        assessment: t.Optional(t.String()),
        plan: t.Optional(t.String()),
      }),
      detail: { summary: 'Create/Update SOAP Note', tags: ['Clinical'] },
    }
  );
