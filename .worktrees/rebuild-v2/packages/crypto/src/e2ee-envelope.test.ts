/* eslint-disable id-length */

import { describe, expect, it } from 'bun:test';
import {
  assertClientEncryptedPayload,
  getClientEncryptedRecipients,
  redactClientEncryptedPayload,
} from './e2ee-envelope';

const validPayload = () => ({
  v: 1,
  mode: 'client_e2ee',
  alg: 'AES-256-GCM',
  iv: Buffer.alloc(12, 1).toString('base64'),
  tag: Buffer.alloc(16, 2).toString('base64'),
  ciphertext: Buffer.from('encrypted content').toString('base64'),
  recipients: [
    {
      userId: 'user-1',
      keyId: 'device-key-1',
      wrapAlg: 'ECDH-ES+A256KW',
      wrappedContentKey: Buffer.from('wrapped key').toString('base64'),
    },
  ],
  aad: {
    purpose: 'secure-message',
  },
});

describe('client E2EE envelope', () => {
  it('accepts a ciphertext-only payload with recipient key envelopes', () => {
    const payload = assertClientEncryptedPayload(validPayload());

    expect(payload.mode).toBe('client_e2ee');
    expect(getClientEncryptedRecipients(payload)).toHaveLength(1);
    expect(redactClientEncryptedPayload(payload)).toEqual({
      v: 1,
      mode: 'client_e2ee',
      alg: 'AES-256-GCM',
      recipientCount: 1,
      keyIds: ['device-key-1'],
    });
  });

  it('rejects plaintext fields inside the encrypted payload wrapper', () => {
    expect(() =>
      assertClientEncryptedPayload({
        ...validPayload(),
        body: 'plaintext',
      }),
    ).toThrow('plaintext field');
  });

  it('rejects payloads without recipient key envelopes', () => {
    expect(() =>
      assertClientEncryptedPayload({
        ...validPayload(),
        recipients: [],
      }),
    ).toThrow('at least one recipient');
  });
});
