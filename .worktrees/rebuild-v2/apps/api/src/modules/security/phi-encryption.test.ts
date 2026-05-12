import { describe, expect, it } from 'bun:test';
import {
  createPhiEnvelopeKeyProvider,
  resolvePhiEncryptionProviderConfig,
} from './phi-encryption';
import {
  encodeLocalMasterKey,
  generateAes256Key,
} from '@workspace/crypto/field-encryption';

describe('PHI encryption provider config', () => {
  it('rejects local key material in production by default', () => {
    expect(() =>
      resolvePhiEncryptionProviderConfig({
        NODE_ENV: 'production',
        PHI_ENCRYPTION_KEY_PROVIDER: 'local',
        PHI_ENCRYPTION_LOCAL_KEY_ID: 'local-dev-key',
      }),
    ).toThrow('managed KMS/Vault');
  });

  it('requires a key id for the selected provider', () => {
    expect(() =>
      resolvePhiEncryptionProviderConfig({
        NODE_ENV: 'development',
        PHI_ENCRYPTION_KEY_PROVIDER: 'kms',
      }),
    ).toThrow('kms key id');
  });

  it('creates a local provider for development and test only', async () => {
    const provider = createPhiEnvelopeKeyProvider({
      NODE_ENV: 'test',
      PHI_ENCRYPTION_KEY_PROVIDER: 'local',
      PHI_ENCRYPTION_LOCAL_KEY_ID: 'local-dev-key-v1',
      PHI_ENCRYPTION_LOCAL_MASTER_KEY_B64:
        encodeLocalMasterKey(generateAes256Key()),
    });

    const dataKey = await provider.generateDataKey({ purpose: 'test' });
    expect(dataKey.keyId).toBe('local-dev-key-v1');
    expect(dataKey.plaintextKey.byteLength).toBe(32);
  });
});
