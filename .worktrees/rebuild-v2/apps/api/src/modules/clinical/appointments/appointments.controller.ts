import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, gte, lte, or, desc, asc, ilike, type SQL } from 'drizzle-orm';

export const appointmentsController = new Elysia({ prefix: '/appointments' })
  .use(authMacro)
  .get(
    '/',
    async ({ query, user }) => {
      const { 
        start, 
        end, 
        status,
        search, 
        limit = 20, 
        offset = 0, 
        sortBy = 'scheduledTime', 
        sortOrder = 'desc' 
      } = query;

      let whereClause: SQL | undefined = eq(schema.patients.organizationId, user.organizationId!);

      if (start) {
        whereClause = and(whereClause, gte(schema.appointments.scheduledTime, new Date(start)));
      }
      if (end) {
        whereClause = and(whereClause, lte(schema.appointments.scheduledTime, new Date(end)));
      }
      if (status) {
        whereClause = and(whereClause, eq(schema.appointments.status, status));
      }
      if (search) {
        whereClause = and(
          whereClause,
          or(
            ilike(schema.patients.firstName, `%${search}%`),
            ilike(schema.patients.lastName, `%${search}%`),
            ilike(schema.patients.email, `%${search}%`)
          )
        );
      }

      const orderColumn = (schema.appointments as any)[sortBy] || schema.appointments.scheduledTime;
      const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

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
        .limit(limit)
        .offset(offset)
        .orderBy(orderDirection);

      return items;
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      transform({ query }) {
        if (query.limit) query.limit = +query.limit;
        if (query.offset) query.offset = +query.offset;
      },
      query: t.Object({
        start: t.Optional(t.String()),
        end: t.Optional(t.String()),
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
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

      return items;
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      detail: { summary: 'List Patient Waitlist', tags: ['Clinical'] },
    }
  )
  .get(
    '/:id',
    async ({ params: { id }, user }) => {
      const [appointment] = await db
        .select({
          appointment: schema.appointments,
          patient: schema.patients,
          provider: schema.providers,
        })
        .from(schema.appointments)
        .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
        .leftJoin(schema.providers, eq(schema.appointments.providerId, schema.providers.id))
        .where(
          and(
            eq(schema.appointments.id, id),
            eq(schema.patients.organizationId, user.organizationId!)
          )
        )
        .limit(1);

      if (!appointment) throw new Error('Appointment not found');
      return appointment;
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Get Appointment Details', tags: ['Clinical'] },
    }
  )
  .patch(
    '/:id',
    async ({ params: { id }, body }) => {
      const [appointment] = await db
        .update(schema.appointments)
        .set({
          ...body,
          scheduledTime: body.scheduledTime ? new Date(body.scheduledTime) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(schema.appointments.id, id))
        .returning();
      
      if (!appointment) throw new Error('Appointment not found');
      return appointment;
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Optional(t.String()),
        reason: t.Optional(t.String()),
        scheduledTime: t.Optional(t.String()),
        providerId: t.Optional(t.String()),
        meetingUrl: t.Optional(t.String()),
      }),
      detail: { summary: 'Update Appointment', tags: ['Clinical'] },
    }
  )
  .get(
    '/:id/soap-notes',
    async ({ params: { id } }) => {
      const notes = await db
        .select()
        .from(schema.soapNotes)
        .where(eq(schema.soapNotes.appointmentId, id));

      return notes;
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
