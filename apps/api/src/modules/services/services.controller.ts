import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';

export const servicesController = new Elysia({ prefix: '/services' })
  .use(authMacro)
  .get(
    '/',
    async ({ user }) => {
      return await db
        .select()
        .from(schema.services)
        .where(eq(schema.services.organizationId, user.organizationId!))
        .orderBy(desc(schema.services.createdAt));
    },
    {
      isSignIn: true,
      detail: { summary: 'List Services', tags: ['Services'] },
    }
  )
  .post(
    '/',
    async ({ body, user }) => {
      const [service] = await db
        .insert(schema.services)
        .values({
          ...body,
          organizationId: user.organizationId!,
          updatedAt: new Date(),
        })
        .returning();
      return service;
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:settings:write'],
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        price: t.Number(),
        category: t.String(),
        status: t.Optional(t.String()),
      }),
      detail: { summary: 'Create Service', tags: ['Admin'] },
    }
  );
