import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const auditController = new Elysia({ prefix: '/audit' })
  .use(authMacro)
  .get(
    '/',
    async ({ query, user }) => {
      const { limit = 50, offset = 0 } = query;

      const logs = await db
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.organizationId, user.organizationId!))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.auditLogs.createdAt));

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.organizationId, user.organizationId!));

      return {
        payload: logs,
        total: countResult.count,
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:audit:read'],
      transform({ query }) {
        if (query.limit) query.limit = +query.limit;
        if (query.offset) query.offset = +query.offset;
      },
      query: t.Object({
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
      }),
      detail: { summary: 'List Audit Logs', tags: ['Admin'] },
    }
  );
