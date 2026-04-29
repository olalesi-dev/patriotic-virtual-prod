import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db';
import { eq, and, desc, sql } from 'drizzle-orm';

export const auditController = new Elysia({ prefix: '/audit' })
  .use(authMacro)
  .get(
    '/',
    async ({ query, user }) => {
      const { limit = '50', offset = '0' } = query;

      const items = await db
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.organizationId, user.organizationId!))
        .limit(Number(limit))
        .offset(Number(offset))
        .orderBy(desc(schema.auditLogs.createdAt));

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.organizationId, user.organizationId!));

      return {
        items,
        total: countResult.count,
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:audit:read'],
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: { summary: 'List Audit Logs', tags: ['Admin'] },
    }
  );
