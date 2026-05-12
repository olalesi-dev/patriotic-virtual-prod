/* eslint-disable id-length */

import {
  assertClientEncryptedPayload,
  getClientEncryptedRecipients,
  redactClientEncryptedPayload,
} from '@workspace/crypto/e2ee-envelope';

export const ENCRYPTED_MESSAGE_BODY_PLACEHOLDER = '[client-encrypted]';

export interface EncryptedMessageInput {
  senderId: string;
  recipientId: string;
  encryptedPayload: unknown;
  threadId?: string;
}

export interface EncryptedMessageInsert {
  senderId: string;
  recipientId: string;
  body: typeof ENCRYPTED_MESSAGE_BODY_PLACEHOLDER;
  encryptionMode: 'client_e2ee';
  encryptedPayload: Record<string, unknown>;
  encryptedKeyRecipients: Record<string, unknown>[];
  threadId?: string;
}

export interface MessageRecipientScope {
  senderUserId: string;
  senderOrganizationId?: string | null;
  recipientUserId: string;
  recipientOrganizationId?: string | null;
}

export const buildEncryptedMessageInsert = (
  input: EncryptedMessageInput,
): EncryptedMessageInsert => {
  const encryptedPayload = assertClientEncryptedPayload(input.encryptedPayload);

  if (
    !encryptedPayload.recipients.some(
      (recipient) => recipient.userId === input.recipientId,
    )
  ) {
    throw new Error(
      'Encrypted message payload must include a recipient key envelope.',
    );
  }

  return {
    senderId: input.senderId,
    recipientId: input.recipientId,
    body: ENCRYPTED_MESSAGE_BODY_PLACEHOLDER,
    encryptionMode: 'client_e2ee',
    encryptedPayload: encryptedPayload as unknown as Record<string, unknown>,
    encryptedKeyRecipients: getClientEncryptedRecipients(
      encryptedPayload,
    ) as unknown as Record<string, unknown>[],
    threadId: input.threadId,
  };
};

export const assertMessageRecipientScope = (scope: MessageRecipientScope) => {
  if (scope.senderUserId === scope.recipientUserId) {
    throw new Error('Cannot send a secure message to yourself.');
  }

  if (!scope.senderOrganizationId || !scope.recipientOrganizationId) {
    throw new Error('Secure messaging requires organization-scoped users.');
  }

  if (scope.senderOrganizationId !== scope.recipientOrganizationId) {
    throw new Error('Secure message recipient was not found.');
  }
};

export const parseMessageSyncCursor = (cursor?: string) => {
  if (!cursor?.trim()) {
    return undefined;
  }

  const parsed = new Date(cursor);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid message sync cursor.');
  }

  return parsed;
};

export const buildEncryptedMessageAuditDetails = (
  encryptedPayload: unknown,
) => ({
  encryption: redactClientEncryptedPayload(
    assertClientEncryptedPayload(encryptedPayload),
  ),
});
