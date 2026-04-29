import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const communityController = new Elysia({ prefix: '/community' })
  .use(authMacro)
  .get(
    '/moderation-logs',
    async ({ user }) => {
      return await db
        .select()
        .from(schema.moderationLogs)
        .where(eq(schema.moderationLogs.organizationId, user.organizationId!))
        .orderBy(desc(schema.moderationLogs.timestamp));
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:community:read'],
      detail: { summary: 'List Moderation Logs', tags: ['Admin'] },
    }
  )
  .post(
    '/resolve/:id',
    async ({ params: { id }, body, user }) => {
      const [updated] = await db
        .update(schema.moderationLogs)
        .set({
          resolved: true,
          actionTaken: body.action,
        })
        .where(
          and(
            eq(schema.moderationLogs.id, id),
            eq(schema.moderationLogs.organizationId, user.organizationId!)
          )
        )
        .returning();
      
      return updated;
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:community:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({
        action: t.String(),
      }),
      detail: { summary: 'Resolve Moderation Log', tags: ['Admin'] },
    }
  );
