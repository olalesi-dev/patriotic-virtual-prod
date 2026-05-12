import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import {
  assertMessageRecipientScope,
  buildEncryptedMessageInsert,
} from '../../messages/e2ee-message';
import { BadRequestException, NotFoundException } from '../../../utils/errors';

const findRecipientInSenderScope = async (
  recipientId: string,
  senderOrganizationId?: string | null,
) => {
  const [recipient] = await db
    .select({
      id: schema.users.id,
      organizationId: schema.users.organizationId,
    })
    .from(schema.users)
    .where(eq(schema.users.id, recipientId))
    .limit(1);

  if (!recipient || recipient.organizationId !== senderOrganizationId) {
    throw new NotFoundException('Secure message recipient was not found.');
  }

  return recipient;
};

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
            eq(schema.messages.senderId, user.id),
          ),
        )
        .orderBy(desc(schema.messages.createdAt));

      return items;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:read'],
      detail: { summary: 'List Inbox Messages', tags: ['Clinical'] },
    },
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
              eq(schema.messages.senderId, user.id),
            ),
          ),
        )
        .limit(1);

      if (!message) {
        throw new Error('Message not found');
      }
      return message;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Get Message Details', tags: ['Clinical'] },
    },
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
            eq(schema.messages.recipientId, user.id),
          ),
        )
        .returning();

      if (!message) {
        throw new Error('Message not found or unauthorized');
      }
      return message;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:write'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Mark Message as Read', tags: ['Clinical'] },
    },
  )
  .post(
    '/encrypted',
    async ({ body, user }) => {
      try {
        const recipient = await findRecipientInSenderScope(
          body.recipientId,
          user.organizationId,
        );
        assertMessageRecipientScope({
          senderUserId: user.id,
          senderOrganizationId: user.organizationId,
          recipientUserId: recipient.id,
          recipientOrganizationId: recipient.organizationId,
        });

        const [message] = await db
          .insert(schema.messages)
          .values(
            buildEncryptedMessageInsert({
              senderId: user.id,
              recipientId: body.recipientId,
              encryptedPayload: body.encryptedPayload,
              threadId: body.threadId,
            }) as typeof schema.messages.$inferInsert,
          )
          .returning();

        return message;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException((error as Error).message);
      }
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:write'],
      body: t.Object({
        recipientId: t.String(),
        encryptedPayload: t.Any(),
        threadId: t.Optional(t.String()),
      }),
      detail: { summary: 'Send Encrypted Message', tags: ['Clinical'] },
    },
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
    },
  );
