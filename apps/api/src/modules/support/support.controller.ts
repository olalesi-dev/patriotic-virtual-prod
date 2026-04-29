import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';

export const supportController = new Elysia({ prefix: '/support' })
  .use(authMacro)
  .post(
    '/tickets',
    async ({ body, user }) => {
      const [ticket] = await db
        .insert(schema.supportTickets)
        .values({
          organizationId: user.organizationId!,
          userId: user.id,
          subject: body.subject,
          message: body.message,
          priority: body.priority || 'medium',
          updatedAt: new Date(),
        })
        .returning();
      
      return ticket;
    },
    {
      isSignIn: true,
      body: t.Object({
        subject: t.String(),
        message: t.String(),
        priority: t.Optional(t.String()),
      }),
      detail: { summary: 'Create Support Ticket', tags: ['Support'] },
    }
  )
  .get(
    '/tickets',
    async ({ user }) => {
      return await db
        .select()
        .from(schema.supportTickets)
        .where(eq(schema.supportTickets.userId, user.id))
        .orderBy(desc(schema.supportTickets.createdAt));
    },
    {
      isSignIn: true,
      detail: { summary: 'List My Support Tickets', tags: ['Support'] },
    }
  );
