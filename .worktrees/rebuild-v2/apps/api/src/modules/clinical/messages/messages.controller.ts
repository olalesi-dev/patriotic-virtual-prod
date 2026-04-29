import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

export const messagesController = new Elysia({ prefix: '/messages' })
  .use(authMacro)
  .get(
    '/',
    async ({ user }) => {
      const items = await db
        .select({
          message: schema.messages,
          sender: {
            id: schema.users.id,
            name: schema.users.name,
          },
        })
        .from(schema.messages)
        .innerJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
        .where(
          or(
            eq(schema.messages.recipientId, user.id),
            eq(schema.messages.senderId, user.id)
          )
        )
        .orderBy(desc(schema.messages.createdAt));

      return items;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:read'],
      detail: { summary: 'List Inbox Messages', tags: ['Clinical'] },
    }
  )
  .get(
    '/:id',
    async ({ params: { id }, user }) => {
      const [message] = await db
        .select()
        .from(schema.messages)
        .where(
          and(
            eq(schema.messages.id, id),
            or(
              eq(schema.messages.recipientId, user.id),
              eq(schema.messages.senderId, user.id)
            )
          )
        )
        .limit(1);
      
      if (!message) throw new Error('Message not found');
      return message;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Get Message Details', tags: ['Clinical'] },
    }
  )
  .patch(
    '/:id/read',
    async ({ params: { id }, user }) => {
      const [message] = await db
        .update(schema.messages)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.messages.id, id),
            eq(schema.messages.recipientId, user.id)
          )
        )
        .returning();
      
      if (!message) throw new Error('Message not found or unauthorized');
      return message;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:write'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Mark Message as Read', tags: ['Clinical'] },
    }
  )
  .post(
    '/',
    async ({ body, user }) => {
      const [message] = await db
        .insert(schema.messages)
        .values({
          senderId: user.id,
          recipientId: body.recipientId,
          subject: body.subject,
          body: body.body,
          threadId: body.threadId,
        })
        .returning();

      return message;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:write'],
      body: t.Object({
        recipientId: t.String(),
        subject: t.Optional(t.String()),
        body: t.String(),
        threadId: t.Optional(t.String()),
      }),
      detail: { summary: 'Send Message', tags: ['Clinical'] },
    }
  );
