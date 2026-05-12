import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../utils/errors';
import {
  buildPatientDoxyJoinUrl,
  DEFAULT_MEETING_URL,
  isTelehealthJoinAvailable,
  normalizeDoxyMeetingUrl,
  resolveProviderDoxyLink,
} from '@workspace/common/index';

const isAdminRole = (role?: string | null): boolean =>
  role === 'Admin' || role === 'SuperAdmin';

const fullName = (
  person: { firstName?: string | null; lastName?: string | null } | null,
  fallback: string,
): string => {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ');
  return name || fallback;
};

const loadTelehealthContext = async (appointmentId: string) => {
  const [context] = await db
    .select({
      appointment: schema.appointments,
      patient: schema.patients,
      provider: schema.providers,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
    .leftJoin(schema.providers, eq(schema.appointments.providerId, schema.providers.id))
    .where(eq(schema.appointments.id, appointmentId))
    .limit(1);

  return context;
};

type TelehealthContext = NonNullable<
  Awaited<ReturnType<typeof loadTelehealthContext>>
>;

const assertTelehealthAccess = (
  context: TelehealthContext,
  user: { id: string; role?: string | null; organizationId?: string | null },
) => {
  const sameOrganization = context.patient.organizationId === user.organizationId;
  const isProvider = context.provider?.userId === user.id;
  const isPatient = context.patient.userId === user.id;

  if (!sameOrganization && !isProvider && !isPatient && !isAdminRole(user.role)) {
    throw new ForbiddenException('Not authorized for this appointment');
  }
};

const resolveMeetingLinks = async (context: TelehealthContext) => {
  const [providerUser] = context.provider?.userId
    ? await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, context.provider.userId))
        .limit(1)
    : [undefined];

  const providerLink = resolveProviderDoxyLink({
    email: providerUser?.email,
  });
  const normalizedMeetingUrl = normalizeDoxyMeetingUrl(
    context.appointment.meetingUrl || providerLink.url || DEFAULT_MEETING_URL,
  );
  const patientJoinLink = buildPatientDoxyJoinUrl({
    meetingUrl: normalizedMeetingUrl,
    patientName: fullName(context.patient, 'Patient'),
    patientId: context.patient.id,
  });

  return {
    room: providerLink.room,
    providerJoinLink: normalizedMeetingUrl,
    patientJoinLink,
  };
};

export const telehealthController = new Elysia({ prefix: '/telehealth' })
  .use(authMacro)
  .post(
    '/appointments/:id/generate-link',
    async ({ params: { id }, user }) => {
      const context = await loadTelehealthContext(id);
      if (!context) {throw new NotFoundException('Appointment not found');}

      assertTelehealthAccess(context, user);
      const links = await resolveMeetingLinks(context);

      if (context.appointment.meetingUrl !== links.providerJoinLink) {
        await db
          .update(schema.appointments)
          .set({
            meetingUrl: links.providerJoinLink,
            updatedAt: new Date(),
          })
          .where(eq(schema.appointments.id, id));
      }

      const isPatient = context.patient.userId === user.id;

      return {
        provider: 'DOXY',
        room: links.room,
        joinLink: isPatient ? links.patientJoinLink : links.providerJoinLink,
        providerJoinLink: links.providerJoinLink,
        patientJoinLink: links.patientJoinLink,
        joinAvailable: isTelehealthJoinAvailable(
          context.appointment.scheduledTime,
        ),
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:write'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Generate Telehealth Meeting Link', tags: ['Clinical'] },
    }
  )
  .post(
    '/appointments/:id/complete',
    async ({ params: { id }, body, user }) => {
      const context = await loadTelehealthContext(id);
      if (!context) {throw new NotFoundException('Appointment not found');}
      assertTelehealthAccess(context, user);

      if (!context.provider?.id) {
        throw new BadRequestException('Appointment has no assigned provider');
      }

      const [appointment] = await db
        .update(schema.appointments)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(schema.appointments.id, id))
        .returning();

      let note: typeof schema.soapNotes.$inferSelect | undefined;
      const { soapNote } = body;
      if (
        soapNote?.subjective ||
        soapNote?.objective ||
        soapNote?.assessment ||
        soapNote?.plan
      ) {
        const [existingNote] = await db
          .select()
          .from(schema.soapNotes)
          .where(eq(schema.soapNotes.appointmentId, id))
          .limit(1);

        if (existingNote) {
          [note] = await db
            .update(schema.soapNotes)
            .set({
              subjective: soapNote.subjective,
              objective: soapNote.objective,
              assessment: soapNote.assessment,
              plan: soapNote.plan,
              updatedAt: new Date(),
            })
            .where(eq(schema.soapNotes.id, existingNote.id))
            .returning();
        } else {
          [note] = await db
            .insert(schema.soapNotes)
            .values({
              appointmentId: id,
              patientId: context.patient.id,
              providerId: context.provider.id,
              subjective: soapNote.subjective,
              objective: soapNote.objective,
              assessment: soapNote.assessment,
              plan: soapNote.plan,
            })
            .returning();
        }
      }

      return { appointment, soapNote: note };
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({
        soapNote: t.Optional(
          t.Object({
            subjective: t.Optional(t.String()),
            objective: t.Optional(t.String()),
            assessment: t.Optional(t.String()),
            plan: t.Optional(t.String()),
          }),
        ),
      }),
      detail: { summary: 'Complete Telehealth Appointment', tags: ['Clinical'] },
    }
  );
