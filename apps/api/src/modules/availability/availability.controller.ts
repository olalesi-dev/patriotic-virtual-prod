import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { NotFoundException } from '../../utils/errors';

export const availabilityController = new Elysia({ prefix: '/availability' })
  .use(authMacro)
  .get(
    '/me',
    async ({ user }) => {
      const [provider] = await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.userId, user.id))
        .limit(1);

      if (!provider) throw new NotFoundException('Provider profile not found');

      const items = await db
        .select()
        .from(schema.availability)
        .where(eq(schema.availability.providerId, provider.id));

      return items;
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:read'],
      detail: { summary: 'Get My Availability', tags: ['Availability'] },
    },
  )
  .post(
    '/block',
    async ({ body, user }) => {
      const [provider] = await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.userId, user.id))
        .limit(1);

      if (!provider) throw new NotFoundException('Provider profile not found');

      const [item] = await db
        .insert(schema.availability)
        .values({
          providerId: provider.id,
          type: 'block',
          startTime: new Date(body.startTime),
          endTime: new Date(body.endTime),
          updatedAt: new Date(),
        })
        .returning();

      return item;
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:write'],
      body: t.Object({
        startTime: t.String(),
        endTime: t.String(),
      }),
      detail: { summary: 'Block Time Slot', tags: ['Availability'] },
    },
  )
  .delete(
    '/block/:id',
    async ({ params: { id }, user }) => {
      const [provider] = await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.userId, user.id))
        .limit(1);

      if (!provider) throw new NotFoundException('Provider profile not found');

      await db
        .delete(schema.availability)
        .where(
          and(
            eq(schema.availability.id, id),
            eq(schema.availability.providerId, provider.id),
          ),
        );

      return { success: true };
    },
    {
      isSignIn: true,
      requirePermissions: ['appointments:write'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Unblock Time Slot', tags: ['Availability'] },
    },
  );
