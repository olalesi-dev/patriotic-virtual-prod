/* eslint-disable id-length */

import {
  assertClientEncryptedPayload,
  getClientEncryptedRecipients,
  redactClientEncryptedPayload,
} from '@workspace/crypto/e2ee-envelope';

export const ENCRYPTED_DOCUMENT_STORAGE_PROVIDER = 'app-encrypted-documents';
export const ENCRYPTED_DOCUMENT_STATUS_PENDING = 'pending';
export const ENCRYPTED_DOCUMENT_STATUS_AVAILABLE = 'available';

export interface EncryptedDocumentUploadInput {
  id: string;
  organizationId: string;
  ownerUserId: string;
  encryptedPayload: unknown;
  encryptedMetadata?: unknown;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
}

export interface EncryptedDocumentRecipientScope {
  ownerUserId: string;
  ownerOrganizationId?: string | null;
  recipients: {
    userId: string;
    organizationId?: string | null;
  }[];
}

export interface EncryptedDocumentCompleteInput {
  sizeBytes?: number;
  checksumSha256?: string;
}

export const buildEncryptedDocumentStorageObjectKey = (input: {
  organizationId: string;
  ownerUserId: string;
  uploadId: string;
}) =>
  [
    'organizations',
    input.organizationId,
    'users',
    input.ownerUserId,
    'encrypted-documents',
    input.uploadId,
  ].join('/');

export const getEncryptedDocumentRecipientUserIds = (
  encryptedPayload: unknown,
) => [
  ...new Set(
    assertClientEncryptedPayload(encryptedPayload).recipients.map(
      (recipient) => recipient.userId,
    ),
  ),
];

export const assertEncryptedDocumentRecipientScope = (
  scope: EncryptedDocumentRecipientScope,
) => {
  if (!scope.ownerOrganizationId) {
    throw new Error('Encrypted document uploads require an organization.');
  }

  if (
    !scope.recipients.some(
      (recipient) => recipient.userId === scope.ownerUserId,
    )
  ) {
    throw new Error(
      'Encrypted document payload must include the owner key envelope.',
    );
  }

  for (const recipient of scope.recipients) {
    if (!recipient.organizationId) {
      throw new Error('Encrypted document recipient was not found.');
    }
    if (recipient.organizationId !== scope.ownerOrganizationId) {
      throw new Error('Encrypted document recipient was not found.');
    }
  }
};

export const buildEncryptedDocumentUploadInsert = (
  input: EncryptedDocumentUploadInput,
) => {
  const encryptedPayload = assertClientEncryptedPayload(input.encryptedPayload);
  const encryptedMetadata =
    input.encryptedMetadata === undefined
      ? undefined
      : assertClientEncryptedPayload(input.encryptedMetadata);

  if (
    !encryptedPayload.recipients.some(
      (recipient) => recipient.userId === input.ownerUserId,
    )
  ) {
    throw new Error(
      'Encrypted document payload must include the owner key envelope.',
    );
  }

  return {
    id: input.id,
    organizationId: input.organizationId,
    ownerUserId: input.ownerUserId,
    storageProvider: ENCRYPTED_DOCUMENT_STORAGE_PROVIDER,
    storageObjectKey: buildEncryptedDocumentStorageObjectKey({
      organizationId: input.organizationId,
      ownerUserId: input.ownerUserId,
      uploadId: input.id,
    }),
    encryptionMode: 'client_e2ee' as const,
    encryptedPayload: encryptedPayload as unknown as Record<string, unknown>,
    encryptedKeyRecipients: getClientEncryptedRecipients(
      encryptedPayload,
    ) as unknown as Record<string, unknown>[],
    encryptedMetadata: encryptedMetadata as unknown as
      | Record<string, unknown>
      | undefined,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksumSha256: input.checksumSha256,
    status: ENCRYPTED_DOCUMENT_STATUS_PENDING,
  };
};

export const buildEncryptedDocumentCompleteUpdate = (
  input: EncryptedDocumentCompleteInput,
) => {
  if (
    input.sizeBytes !== undefined &&
    (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0)
  ) {
    throw new Error('Encrypted document sizeBytes must be a positive integer.');
  }

  if (
    input.checksumSha256 !== undefined &&
    !/^[a-f0-9]{64}$/i.test(input.checksumSha256)
  ) {
    throw new Error(
      'Encrypted document checksumSha256 must be a SHA-256 hex digest.',
    );
  }

  return {
    sizeBytes: input.sizeBytes,
    checksumSha256: input.checksumSha256,
    status: ENCRYPTED_DOCUMENT_STATUS_AVAILABLE,
    updatedAt: new Date(),
  };
};

export const buildEncryptedDocumentAuditDetails = (
  encryptedPayload: unknown,
) => ({
  encryption: redactClientEncryptedPayload(
    assertClientEncryptedPayload(encryptedPayload),
  ),
});
