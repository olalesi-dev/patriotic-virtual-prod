import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db';
import { eq, and, ilike, or, desc } from 'drizzle-orm';

export const usersController = new Elysia({ prefix: '/users' })
  .use(authMacro)
  .get(
    '/',
    async ({ query, user }) => {
      const { search, limit = '20', offset = '0' } = query;

      let whereClause = eq(schema.users.organizationId, user.organizationId!);

      if (search) {
        whereClause = and(
          whereClause,
          or(
            ilike(schema.users.name, `%${search}%`),
            ilike(schema.users.email, `%${search}%`)
          )
        ) as any;
      }

      const items = await db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          role: schema.roles.name,
          createdAt: schema.users.createdAt,
          emailVerified: schema.users.emailVerified,
        })
        .from(schema.users)
        .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
        .where(whereClause)
        .limit(Number(limit))
        .offset(Number(offset))
        .orderBy(desc(schema.users.createdAt));

      return items;
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:read'],
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: { summary: 'List Users', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id',
    async ({ params: { id }, body, user }) => {
      const [updated] = await db
        .update(schema.users)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.users.id, id),
            eq(schema.users.organizationId, user.organizationId!)
          )
        )
        .returning();

      if (!updated) throw new Error('User not found or unauthorized');
      return updated;
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        roleId: t.Optional(t.String()),
      }),
      detail: { summary: 'Update User', tags: ['Admin'] },
    }
  )
  .delete(
    '/:id',
    async ({ params: { id }, user }) => {
      await db
        .delete(schema.users)
        .where(
          and(
            eq(schema.users.id, id),
            eq(schema.users.organizationId, user.organizationId!)
          )
        );
      return { success: true };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:write'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Delete User', tags: ['Admin'] },
    }
  );
