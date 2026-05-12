import { describe, expect, it } from 'bun:test';
import {
  AES_256_GCM_ALGORITHM,
  LocalEnvelopeKeyProvider,
  createLocalEnvelopeKeyProviderFromBase64,
  decryptUtf8,
  encodeLocalMasterKey,
  encryptUtf8,
  generateAes256Key,
} from './field-encryption';

const createProvider = () =>
  new LocalEnvelopeKeyProvider({
    keyId: 'local-dev-key-v1',
    masterKey: generateAes256Key(),
  });

describe('field encryption', () => {
  it('encrypts and decrypts UTF-8 payloads with AES-256-GCM envelopes', async () => {
    const provider = createProvider();
    const payload = await encryptUtf8('patient note text', provider, {
      tenantId: 'org-1',
      field: 'messages.body',
    });

    expect(payload.v).toBe(1);
    expect(payload.alg).toBe(AES_256_GCM_ALGORITHM);
    expect(payload.kid).toBe('local-dev-key-v1');
    expect(payload.ciphertext).not.toContain('patient note text');

    await expect(decryptUtf8(payload, provider)).resolves.toBe(
      'patient note text',
    );
  });

  it('fails authentication when ciphertext or associated context changes', async () => {
    const provider = createProvider();
    const payload = await encryptUtf8('secure content', provider, {
      recordId: 'msg-1',
    });

    await expect(
      decryptUtf8(payload, provider, { recordId: 'msg-2' }),
    ).rejects.toThrow();

    await expect(
      decryptUtf8(
        {
          ...payload,
          ciphertext: Buffer.from('tampered').toString('base64'),
        },
        provider,
      ),
    ).rejects.toThrow();
  });

  it('requires 32-byte local master keys', () => {
    expect(
      () =>
        new LocalEnvelopeKeyProvider({
          keyId: 'bad-key',
          masterKey: new Uint8Array(16),
        }),
    ).toThrow('32 bytes');
  });

  it('creates a provider from a base64 encoded local development key', async () => {
    const key = generateAes256Key();
    const provider = createLocalEnvelopeKeyProviderFromBase64(
      'local-dev-key-v2',
      encodeLocalMasterKey(key),
    );

    const payload = await encryptUtf8('hello', provider);
    await expect(decryptUtf8(payload, provider)).resolves.toBe('hello');
  });
});
