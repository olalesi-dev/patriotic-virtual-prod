import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq } from 'drizzle-orm';
import { ForbiddenException, NotFoundException } from '../../utils/errors';
import { DEFAULT_MEETING_URL } from '@workspace/common';

export const telehealthController = new Elysia({ prefix: '/telehealth' })
  .use(authMacro)
  .post(
    '/appointments/:id/generate-link',
    async ({ params: { id }, user }) => {
      const [appointment] = await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.id, id))
        .limit(1);

      if (!appointment) throw new NotFoundException('Appointment not found');

      // Check if user is the provider or admin
      if (appointment.providerId) {
        const [provider] = await db
          .select()
          .from(schema.providers)
          .where(eq(schema.providers.id, appointment.providerId))
          .limit(1);
        
        if (provider?.userId !== user.id && user.role !== 'Admin' && user.role !== 'SuperAdmin') {
          throw new ForbiddenException('Not authorized to generate link for this appointment');
        }
      }

      // In a real app, we would call Doxy/Zoom/Meet API here
      // For now, return the default meeting URL or provider's link
      const joinLink = appointment.meetingUrl || DEFAULT_MEETING_URL;

      return {
        provider: 'DOXY',
        joinLink,
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:write'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Generate Telehealth Meeting Link', tags: ['Clinical'] },
    }
  );
