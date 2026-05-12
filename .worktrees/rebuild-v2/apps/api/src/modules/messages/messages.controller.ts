import { Elysia, t } from 'elysia';
import { and, desc, eq, gt, or } from 'drizzle-orm';
import * as schema from '@workspace/db/schema';
import { db } from '../../db';
import { authMacro } from '../auth/macro';
import { BadRequestException, NotFoundException } from '../../utils/errors';
import {
  assertMessageRecipientScope,
  buildEncryptedMessageInsert,
  parseMessageSyncCursor,
} from './e2ee-message';

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

  if (!recipient) {
    throw new NotFoundException('Secure message recipient was not found.');
  }

  if (recipient.organizationId !== senderOrganizationId) {
    throw new NotFoundException('Secure message recipient was not found.');
  }

  return recipient;
};

export const secureMessagesController = new Elysia({ prefix: '/messages' })
  .use(authMacro)
  .get(
    '/',
    async ({ user }) =>
      await db
        .select()
        .from(schema.messages)
        .where(
          or(
            eq(schema.messages.recipientId, user.id),
            eq(schema.messages.senderId, user.id),
          ),
        )
        .orderBy(desc(schema.messages.createdAt)),
    {
      isSignIn: true,
      requirePermissions: ['communications:read'],
      detail: { summary: 'List Secure Messages', tags: ['Messages'] },
    },
  )
  .get(
    '/sync',
    async ({ query, user }) => {
      const since = parseMessageSyncCursor(query.after);
      const participantFilter = or(
        eq(schema.messages.recipientId, user.id),
        eq(schema.messages.senderId, user.id),
      );

      const messages = await db
        .select()
        .from(schema.messages)
        .where(
          since
            ? and(participantFilter, gt(schema.messages.createdAt, since))
            : participantFilter,
        )
        .orderBy(desc(schema.messages.createdAt));

      return {
        cursor: messages[0]?.createdAt?.toISOString() ?? query.after,
        messages,
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:read'],
      query: t.Object({
        after: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Sync Secure Messages',
        tags: ['Messages'],
        description:
          'Polling-friendly encrypted message sync. Clients can call this after push notification wakeups or on an interval instead of keeping a WebSocket open.',
      },
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
        throw new NotFoundException('Secure message was not found.');
      }

      return message;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Get Secure Message', tags: ['Messages'] },
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
        throw new NotFoundException('Secure message was not found.');
      }

      return message;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:write'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Mark Secure Message As Read', tags: ['Messages'] },
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
      detail: { summary: 'Send Encrypted Secure Message', tags: ['Messages'] },
    },
  );
