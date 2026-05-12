import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import {
  type AppointmentUpdateBody,
  updateAppointmentAndNotify,
} from '../clinical/appointments/appointments.controller';
import { BadRequestException } from '../../utils/errors';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;

const toScheduledTime = (date: unknown, time: unknown) => {
  const dateValue = asString(date);
  const timeValue = asString(time);
  if (!dateValue || !timeValue) {
    return undefined;
  }

  const scheduledTime = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(scheduledTime.getTime())) {
    throw new BadRequestException('Invalid appointment date/time.');
  }

  return scheduledTime.toISOString();
};

export const mapDashboardAppointmentUpdateBody = (
  body: unknown,
): AppointmentUpdateBody => {
  if (!isRecord(body)) {
    throw new BadRequestException('Invalid appointment update payload.');
  }

  const action = asString(body.action);
  if (action === 'reschedule') {
    const scheduledTime = toScheduledTime(body.date, body.time);
    if (!scheduledTime) {
      throw new BadRequestException('Appointment date and time are required.');
    }

    return { scheduledTime };
  }

  const status = asString(body.status);
  if (action === 'status' || status) {
    if (!status) {
      throw new BadRequestException('Appointment status is required.');
    }

    return {
      status,
      reason: asString(body.reason),
    };
  }

  throw new BadRequestException('Invalid appointment update payload.');
};

const mapNotificationResponse = (
  notification: Record<string, unknown> | undefined,
) => {
  if (!notification || notification.status === 'not_applicable') {
    return { queued: false };
  }

  if (notification.status === 'failed') {
    return {
      queued: false,
      error: asString(notification.error) ?? 'Notification failed.',
    };
  }

  return { queued: true };
};

export const dashboardAppointmentsController = new Elysia({
  prefix: '/dashboard/appointments',
})
  .use(authMacro)
  .patch(
    '/:id',
    async ({ params: { id }, body, user, set }) => {
      const updateBody = mapDashboardAppointmentUpdateBody(body);
      const appointment = await updateAppointmentAndNotify(
        id,
        updateBody,
        user,
        set,
      );

      return {
        success: true,
        notification: mapNotificationResponse(
          appointment.notification as Record<string, unknown> | undefined,
        ),
        appointment: {
          id: appointment.id,
          statusKey: appointment.status,
          statusLabel: appointment.status,
          startAt: appointment.scheduledTime?.toISOString(),
          date: appointment.scheduledTime?.toISOString().slice(0, 10),
          time: appointment.scheduledTime?.toISOString().slice(11, 16),
        },
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:write'],
      params: t.Object({ id: t.String() }),
      body: t.Record(t.String(), t.Unknown()),
      detail: {
        summary: 'Legacy Dashboard Appointment Update',
        tags: ['Dashboard'],
      },
    },
  );
