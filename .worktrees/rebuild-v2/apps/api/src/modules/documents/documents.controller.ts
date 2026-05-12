import { Elysia, t } from 'elysia';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import * as schema from '@workspace/db/schema';
import { db } from '../../db';
import { authMacro } from '../auth/macro';
import { BadRequestException, NotFoundException } from '../../utils/errors';
import {
  assertEncryptedDocumentRecipientScope,
  buildEncryptedDocumentCompleteUpdate,
  buildEncryptedDocumentUploadInsert,
  getEncryptedDocumentRecipientUserIds,
} from './e2ee-document';

const encryptedDocumentAccessibleBy = (userId: string) =>
  or(
    eq(schema.encryptedDocumentUploads.ownerUserId, userId),
    sql`${schema.encryptedDocumentUploads.encryptedKeyRecipients} @> ${JSON.stringify(
      [{ userId }],
    )}::jsonb`,
  );

const requireOrganizationId = (organizationId?: string | null) => {
  if (!organizationId) {
    throw new BadRequestException(
      'Encrypted document uploads require an organization.',
    );
  }
  return organizationId;
};

const assertUploadRecipients = async (input: {
  encryptedPayload: unknown;
  ownerUserId: string;
  ownerOrganizationId: string;
}) => {
  const recipientUserIds = getEncryptedDocumentRecipientUserIds(
    input.encryptedPayload,
  );
  const recipientUsers = await db
    .select({
      userId: schema.users.id,
      organizationId: schema.users.organizationId,
    })
    .from(schema.users)
    .where(inArray(schema.users.id, recipientUserIds));

  const recipientsById = new Map(
    recipientUsers.map((recipient) => [recipient.userId, recipient]),
  );

  assertEncryptedDocumentRecipientScope({
    ownerUserId: input.ownerUserId,
    ownerOrganizationId: input.ownerOrganizationId,
    recipients: recipientUserIds.map((userId) => ({
      userId,
      organizationId: recipientsById.get(userId)?.organizationId,
    })),
  });
};

export const documentsController = new Elysia({ prefix: '/documents' })
  .use(authMacro)
  .get(
    '/encrypted',
    async ({ user }) => {
      const organizationId = requireOrganizationId(user.organizationId);
      return await db
        .select()
        .from(schema.encryptedDocumentUploads)
        .where(
          and(
            eq(schema.encryptedDocumentUploads.organizationId, organizationId),
            encryptedDocumentAccessibleBy(user.id),
          ),
        )
        .orderBy(desc(schema.encryptedDocumentUploads.createdAt));
    },
    {
      isSignIn: true,
      requirePermissions: ['documents:read'],
      detail: { summary: 'List Encrypted Documents', tags: ['Documents'] },
    },
  )
  .get(
    '/encrypted/:id',
    async ({ params: { id }, user }) => {
      const organizationId = requireOrganizationId(user.organizationId);
      const [upload] = await db
        .select()
        .from(schema.encryptedDocumentUploads)
        .where(
          and(
            eq(schema.encryptedDocumentUploads.id, id),
            eq(schema.encryptedDocumentUploads.organizationId, organizationId),
            encryptedDocumentAccessibleBy(user.id),
          ),
        )
        .limit(1);

      if (!upload) {
        throw new NotFoundException('Encrypted document upload was not found.');
      }

      return upload;
    },
    {
      isSignIn: true,
      requirePermissions: ['documents:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Get Encrypted Document', tags: ['Documents'] },
    },
  )
  .post(
    '/encrypted',
    async ({ body, user }) => {
      try {
        const organizationId = requireOrganizationId(user.organizationId);
        const uploadId = schema.generateId();

        await assertUploadRecipients({
          encryptedPayload: body.encryptedPayload,
          ownerUserId: user.id,
          ownerOrganizationId: organizationId,
        });

        const [upload] = await db
          .insert(schema.encryptedDocumentUploads)
          .values(
            buildEncryptedDocumentUploadInsert({
              id: uploadId,
              organizationId,
              ownerUserId: user.id,
              encryptedPayload: body.encryptedPayload,
              encryptedMetadata: body.encryptedMetadata,
              mimeType: body.mimeType,
              sizeBytes: body.sizeBytes,
              checksumSha256: body.checksumSha256,
            }) as typeof schema.encryptedDocumentUploads.$inferInsert,
          )
          .returning();

        return upload;
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException((error as Error).message);
      }
    },
    {
      isSignIn: true,
      requirePermissions: ['documents:write'],
      body: t.Object({
        encryptedPayload: t.Any(),
        encryptedMetadata: t.Optional(t.Any()),
        mimeType: t.Optional(t.String()),
        sizeBytes: t.Optional(t.Number()),
        checksumSha256: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Register Encrypted Document Upload',
        tags: ['Documents'],
        description:
          'Registers client-side encrypted document metadata. The backend stores only ciphertext envelopes and object metadata, not document plaintext.',
      },
    },
  )
  .patch(
    '/encrypted/:id/complete',
    async ({ body, params: { id }, user }) => {
      try {
        const organizationId = requireOrganizationId(user.organizationId);
        const [upload] = await db
          .update(schema.encryptedDocumentUploads)
          .set(buildEncryptedDocumentCompleteUpdate(body))
          .where(
            and(
              eq(schema.encryptedDocumentUploads.id, id),
              eq(
                schema.encryptedDocumentUploads.organizationId,
                organizationId,
              ),
              eq(schema.encryptedDocumentUploads.ownerUserId, user.id),
            ),
          )
          .returning();

        if (!upload) {
          throw new NotFoundException(
            'Encrypted document upload was not found.',
          );
        }

        return upload;
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        throw new BadRequestException((error as Error).message);
      }
    },
    {
      isSignIn: true,
      requirePermissions: ['documents:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({
        sizeBytes: t.Optional(t.Number()),
        checksumSha256: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Complete Encrypted Document Upload',
        tags: ['Documents'],
      },
    },
  );
