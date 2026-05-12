/* eslint-disable id-length */

import { describe, expect, it } from 'bun:test';
import {
  ENCRYPTED_DOCUMENT_STATUS_AVAILABLE,
  ENCRYPTED_DOCUMENT_STATUS_PENDING,
  assertEncryptedDocumentRecipientScope,
  buildEncryptedDocumentCompleteUpdate,
  buildEncryptedDocumentUploadInsert,
  getEncryptedDocumentRecipientUserIds,
} from './e2ee-document';

const encryptedPayload = {
  v: 1,
  mode: 'client_e2ee',
  alg: 'AES-256-GCM',
  iv: Buffer.alloc(12, 1).toString('base64'),
  tag: Buffer.alloc(16, 2).toString('base64'),
  ciphertext: Buffer.from('encrypted document manifest').toString('base64'),
  recipients: [
    {
      userId: 'owner-user-id',
      keyId: 'owner-key-id',
      wrapAlg: 'X25519+A256KW',
      wrappedContentKey: Buffer.from('wrapped owner key').toString('base64'),
    },
    {
      userId: 'recipient-user-id',
      keyId: 'recipient-key-id',
      wrapAlg: 'X25519+A256KW',
      wrappedContentKey: Buffer.from('wrapped recipient key').toString(
        'base64',
      ),
    },
  ],
};

describe('encrypted document uploads', () => {
  it('builds a pending encrypted document upload without plaintext fields', () => {
    const insert = buildEncryptedDocumentUploadInsert({
      id: 'upload-id',
      organizationId: 'org-id',
      ownerUserId: 'owner-user-id',
      encryptedPayload,
      encryptedMetadata: encryptedPayload,
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksumSha256: 'a'.repeat(64),
    });

    expect(insert.encryptionMode).toBe('client_e2ee');
    expect(insert.status).toBe(ENCRYPTED_DOCUMENT_STATUS_PENDING);
    expect(insert.storageProvider).toBe('app-encrypted-documents');
    expect(insert.storageObjectKey).toBe(
      'organizations/org-id/users/owner-user-id/encrypted-documents/upload-id',
    );
    expect(insert.encryptedKeyRecipients).toHaveLength(2);
    expect(JSON.stringify(insert)).not.toContain('encrypted document manifest');
  });

  it('extracts unique document recipient user ids', () => {
    expect(getEncryptedDocumentRecipientUserIds(encryptedPayload)).toEqual([
      'owner-user-id',
      'recipient-user-id',
    ]);
  });

  it('requires the owner key envelope', () => {
    expect(() =>
      buildEncryptedDocumentUploadInsert({
        id: 'upload-id',
        organizationId: 'org-id',
        ownerUserId: 'missing-owner-id',
        encryptedPayload,
      }),
    ).toThrow('owner key envelope');
  });

  it('requires all recipients to be in the owner organization', () => {
    expect(() =>
      assertEncryptedDocumentRecipientScope({
        ownerUserId: 'owner-user-id',
        ownerOrganizationId: 'org-id',
        recipients: [
          { userId: 'owner-user-id', organizationId: 'org-id' },
          { userId: 'recipient-user-id', organizationId: 'other-org-id' },
        ],
      }),
    ).toThrow('recipient was not found');
  });

  it('validates completion metadata before making the upload available', () => {
    expect(
      buildEncryptedDocumentCompleteUpdate({
        sizeBytes: 2048,
        checksumSha256: 'b'.repeat(64),
      }),
    ).toMatchObject({
      sizeBytes: 2048,
      checksumSha256: 'b'.repeat(64),
      status: ENCRYPTED_DOCUMENT_STATUS_AVAILABLE,
    });

    expect(() =>
      buildEncryptedDocumentCompleteUpdate({ checksumSha256: 'not-a-sha' }),
    ).toThrow('SHA-256');
  });
});
