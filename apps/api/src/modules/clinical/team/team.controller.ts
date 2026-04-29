import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and } from 'drizzle-orm';

export const teamController = new Elysia({ prefix: '/team' })
  .use(authMacro)
  .get(
    '/',
    async ({ user }) => {
      const items = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          role: schema.roles.name,
          image: schema.users.image,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
        .where(eq(schema.users.organizationId, user.organizationId!));

      return items;
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:read'],
      detail: { summary: 'List Team Members', tags: ['Clinical'] },
    }
  )
  .get(
    '/providers',
    async ({ user }) => {
      const items = await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.organizationId, user.organizationId!));

      return items;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'], // Providers are needed for assignments
      detail: { summary: 'List Clinical Providers', tags: ['Clinical'] },
    }
  );
