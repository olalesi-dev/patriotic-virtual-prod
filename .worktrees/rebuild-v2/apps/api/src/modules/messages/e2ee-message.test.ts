/* eslint-disable id-length */

import { describe, expect, it } from 'bun:test';
import {
  ENCRYPTED_MESSAGE_BODY_PLACEHOLDER,
  assertMessageRecipientScope,
  buildEncryptedMessageAuditDetails,
  buildEncryptedMessageInsert,
  parseMessageSyncCursor,
} from './e2ee-message';

const encryptedPayload = (recipientId = 'user-2') => ({
  v: 1,
  mode: 'client_e2ee',
  alg: 'AES-256-GCM',
  iv: Buffer.alloc(12, 1).toString('base64'),
  tag: Buffer.alloc(16, 2).toString('base64'),
  ciphertext: Buffer.from('encrypted body').toString('base64'),
  recipients: [
    {
      userId: recipientId,
      keyId: 'recipient-device-key',
      wrapAlg: 'ECDH-ES+A256KW',
      wrappedContentKey: Buffer.from('wrapped key').toString('base64'),
    },
  ],
});

describe('encrypted secure messages', () => {
  it('builds a ciphertext-only message insert payload', () => {
    const insert = buildEncryptedMessageInsert({
      senderId: 'user-1',
      recipientId: 'user-2',
      encryptedPayload: encryptedPayload(),
      threadId: 'thread-1',
    });

    expect(insert.body).toBe(ENCRYPTED_MESSAGE_BODY_PLACEHOLDER);
    expect('subject' in insert).toBe(false);
    expect(insert.encryptionMode).toBe('client_e2ee');
    expect(insert.encryptedKeyRecipients).toHaveLength(1);
    expect(JSON.stringify(insert)).not.toContain('encrypted body');
  });

  it('requires the encrypted payload to include the recipient key envelope', () => {
    expect(() =>
      buildEncryptedMessageInsert({
        senderId: 'user-1',
        recipientId: 'user-2',
        encryptedPayload: encryptedPayload('user-3'),
      }),
    ).toThrow('recipient key envelope');
  });

  it('requires same-organization recipients for cross-role messaging', () => {
    expect(() =>
      assertMessageRecipientScope({
        senderUserId: 'super-admin',
        senderOrganizationId: 'org-1',
        recipientUserId: 'patient',
        recipientOrganizationId: 'org-1',
      }),
    ).not.toThrow();

    expect(() =>
      assertMessageRecipientScope({
        senderUserId: 'super-admin',
        senderOrganizationId: 'org-1',
        recipientUserId: 'patient',
        recipientOrganizationId: 'org-2',
      }),
    ).toThrow('recipient was not found');
  });

  it('rejects self-messages so clients cannot create private echo threads', () => {
    expect(() =>
      assertMessageRecipientScope({
        senderUserId: 'user-1',
        senderOrganizationId: 'org-1',
        recipientUserId: 'user-1',
        recipientOrganizationId: 'org-1',
      }),
    ).toThrow('yourself');
  });

  it('parses message sync cursors for polling-based clients', () => {
    expect(parseMessageSyncCursor()).toBeUndefined();
    expect(parseMessageSyncCursor('2026-05-09T12:00:00.000Z')).toEqual(
      new Date('2026-05-09T12:00:00.000Z'),
    );
    expect(() => parseMessageSyncCursor('bad-date')).toThrow('Invalid');
  });

  it('builds audit details without ciphertext or wrapped keys', () => {
    const insert = buildEncryptedMessageInsert({
      senderId: 'user-1',
      recipientId: 'user-2',
      encryptedPayload: encryptedPayload(),
    });

    expect(buildEncryptedMessageAuditDetails(insert.encryptedPayload)).toEqual({
      encryption: {
        v: 1,
        mode: 'client_e2ee',
        alg: 'AES-256-GCM',
        recipientCount: 1,
        keyIds: ['recipient-device-key'],
      },
    });
  });
});
