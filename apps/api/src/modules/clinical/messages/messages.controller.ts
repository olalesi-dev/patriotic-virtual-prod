import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db';
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

      return { items };
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:read'],
      detail: { summary: 'List Inbox Messages', tags: ['Clinical'] },
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
