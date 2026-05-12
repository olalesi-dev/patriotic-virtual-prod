import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, gte, lte, or, desc, asc, ilike, type SQL } from 'drizzle-orm';
import { NotificationQueue } from '@workspace/queue/index';
import {
  NotificationService,
  type NotificationChannel,
  type NotificationTopicKey,
} from '@workspace/notifications/index';

const notificationQueue = new NotificationQueue();
const notificationService = new NotificationService(db, notificationQueue);
const appointmentNotificationChannels: NotificationChannel[] = [
  'email',
  'sms',
  'in_app',
];

const fullName = (
  person: { firstName?: string | null; lastName?: string | null } | null,
  fallback: string,
): string => {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ');
  return name || fallback;
};

const dateLabel = (value: Date | null): string =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(value)
    : 'your scheduled date';

const timeLabel = (value: Date | null): string =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(value)
    : 'your scheduled time';

const loadAppointmentContext = async (
  appointmentId: string,
  organizationId: string,
) => {
  const [context] = await db
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
        eq(schema.appointments.id, appointmentId),
        eq(schema.patients.organizationId, organizationId),
      ),
    )
    .limit(1);

  return context;
};

type AppointmentContext = NonNullable<
  Awaited<ReturnType<typeof loadAppointmentContext>>
>;

const scheduledTimeChanged = (
  previous: Date | null,
  next: Date | null,
): boolean => previous?.getTime() !== next?.getTime();

const appointmentTopicForUpdate = (
  before: AppointmentContext,
  after: AppointmentContext,
  body: {
    status?: string;
    scheduledTime?: string;
  },
): NotificationTopicKey | undefined => {
  if (body.status === 'cancelled' && before.appointment.status !== 'cancelled') {
    return 'APPOINTMENT_CANCELLED';
  }

  if (
    after.appointment.scheduledTime &&
    before.appointment.status === 'pending_scheduling' &&
    body.status &&
    body.status !== before.appointment.status
  ) {
    return 'APPOINTMENT_BOOKED';
  }

  if (
    body.scheduledTime &&
    after.appointment.scheduledTime &&
    scheduledTimeChanged(
      before.appointment.scheduledTime,
      after.appointment.scheduledTime,
    )
  ) {
    return before.appointment.scheduledTime
      ? 'APPOINTMENT_RESCHEDULED'
      : 'APPOINTMENT_BOOKED';
  }

  return undefined;
};

const buildAppointmentTemplateData = (
  context: AppointmentContext,
  recipientType: 'patient' | 'provider',
) => {
  const appointmentAt = context.appointment.scheduledTime;
  const patientName = fullName(context.patient, 'the patient');
  const providerName = fullName(context.provider, 'your care team');

  return {
    recipient_type: recipientType,
    patient_name: patientName,
    patientName,
    provider_name: providerName,
    providerName,
    appointment_date: dateLabel(appointmentAt),
    appointment_time: timeLabel(appointmentAt),
    appointmentAt: appointmentAt?.toISOString(),
    meetingUrl: context.appointment.meetingUrl,
    portalLink:
      recipientType === 'provider' ? '/appointments' : '/patient/scheduled',
  };
};

const notifyAppointmentUpdate = async (
  topicKey: NotificationTopicKey,
  context: AppointmentContext,
  actor: { id: string; name?: string | null },
) => {
  const recipients: {
    id: string;
    type: 'patient' | 'provider';
  }[] = [{ id: context.patient.id, type: 'patient' }];

  if (context.provider?.id) {
    recipients.push({ id: context.provider.id, type: 'provider' });
  }

  const results = await Promise.all(
    recipients.map((recipient) =>
      notificationService.notify({
        topicKey,
        entityId: context.appointment.id,
        recipientIds: [recipient.id],
        channels: appointmentNotificationChannels,
        dedupeKey: `appointment:${topicKey}:${context.appointment.id}:${recipient.type}`,
        templateData: buildAppointmentTemplateData(context, recipient.type),
        metadata: {
          appointmentId: context.appointment.id,
          patientId: context.patient.id,
          providerId: context.provider?.id,
        },
        actorId: actor.id,
        actorName: actor.name ?? undefined,
        source: 'appointments',
      }),
    ),
  );

  return { topicKey, results };
};

export interface AppointmentUpdateBody {
  status?: string;
  reason?: string;
  scheduledTime?: string;
  providerId?: string;
  meetingUrl?: string;
}

export const updateAppointmentAndNotify = async (
  id: string,
  body: AppointmentUpdateBody,
  user: { id: string; name?: string | null; organizationId?: string | null },
  set?: { status?: number | string },
) => {
  const before = await loadAppointmentContext(id, user.organizationId!);
  if (!before) {throw new Error('Appointment not found');}

  const [appointment] = await db
    .update(schema.appointments)
    .set({
      ...body,
      scheduledTime: body.scheduledTime ? new Date(body.scheduledTime) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(schema.appointments.id, id))
    .returning();

  if (!appointment) {throw new Error('Appointment not found');}

  const after = await loadAppointmentContext(id, user.organizationId!);
  if (!after) {throw new Error('Appointment not found');}

  const topicKey = appointmentTopicForUpdate(before, after, body);
  if (!topicKey) {
    return { ...appointment, notification: { status: 'not_applicable' } };
  }

  try {
    const notification = await notifyAppointmentUpdate(topicKey, after, user);
    return { ...appointment, notification: { status: 'sent', ...notification } };
  } catch (error) {
    if (set) {
      set.status = 207;
    }
    return {
      ...appointment,
      notification: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Notification failed',
      },
    };
  }
};

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
        if (query.limit) {query.limit = Number(query.limit);}
        if (query.offset) {query.offset = Number(query.offset);}
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

      if (!appointment) {throw new Error('Appointment not found');}
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
    async ({ params: { id }, body, user, set }) => updateAppointmentAndNotify(id, body, user, set),
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
      
      if (!appointment) {throw new Error('Appointment not found');}

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
