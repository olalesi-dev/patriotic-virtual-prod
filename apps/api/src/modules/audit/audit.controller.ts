import { Elysia, t } from 'elysia';
import { setupApp } from '../../setup';
import { getAuditLogs } from './service';

export const auditController = new Elysia({ prefix: '/v1/audit/logs' })
  .use(setupApp)
  .get(
    '/',
    async ({ user, query }) => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;

      const { logs, count } = await getAuditLogs({
        page,
        limit,
        userRole: user.role ?? 'user',
        organizationId: user.organizationId ?? undefined,
      });

      return {
        success: true,
        data: logs,
        meta: {
          count,
          page,
          limit,
        },
      };
    },
    {
      isSignIn: true,
      allowedRoles: ['SuperAdmin', 'Admin'],
      query: t.Object({
        page: t.Optional(t.Numeric({ default: 1 })),
        limit: t.Optional(t.Numeric({ default: 10 })),
      }),
      detail: {
        summary: 'Get Audit Logs',
        tags: ['Audit Admin'],
      },
    },
  );
