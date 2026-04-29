import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const communicationsController = new Elysia({ prefix: '/communications' })
  .use(authMacro)
  .get('/broadcast-history', async ({ user }) => {
    return await db
      .select()
      .from(schema.broadcastLogs)
      .where(eq(schema.broadcastLogs.organizationId, user.organizationId!))
      .orderBy(desc(schema.broadcastLogs.timestamp));
  }, {
    isSignIn: true,
    requirePermissions: ['admin:communications:read'],
    detail: { summary: 'Get Broadcast History', tags: ['Admin'] },
  })
  .post('/broadcast', async ({ body, user }) => {
    const orgId = user.organizationId!;
    const [log] = await db.insert(schema.broadcastLogs).values({
      organizationId: orgId,
      subject: body.subject,
      body: body.body,
      priority: body.priority,
      targetFilters: body.filters,
      recipientCount: 0,
      senderId: user.id,
    }).returning();
    
    return log;
  }, {
    isSignIn: true,
    requirePermissions: ['admin:communications:write'],
    body: t.Object({
      subject: t.String(),
      body: t.String(),
      priority: t.String(),
      filters: t.Record(t.String(), t.Any()),
    }),
    detail: { summary: 'Send Broadcast Notification', tags: ['Admin'] },
  });
