/* eslint-disable id-length */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const AES_256_GCM_ALGORITHM = 'AES-256-GCM' as const;
export const LOCAL_KEY_WRAP_ALGORITHM = 'LOCAL-AES-256-GCM' as const;
export const ENCRYPTED_PAYLOAD_VERSION = 1 as const;

const aes256KeyBytes = 32;
const gcmIvBytes = 12;
const gcmTagBytes = 16;

export type EncryptionContext = Record<
  string,
  string | number | boolean | null | undefined
>;

export type NormalizedEncryptionContext = Record<
  string,
  string | number | boolean | null
>;

export interface WrappedDataKey {
  encryptedDataKey: string;
  keyId: string;
  keyWrapAlg: string;
}

export interface GeneratedDataKey extends WrappedDataKey {
  plaintextKey: Uint8Array;
}

export interface EnvelopeKeyProvider {
  generateDataKey(context?: EncryptionContext): Promise<GeneratedDataKey>;
  decryptDataKey(
    wrappedDataKey: WrappedDataKey,
    context?: EncryptionContext,
  ): Promise<Uint8Array>;
}

export interface EncryptedPayloadV1 {
  v: typeof ENCRYPTED_PAYLOAD_VERSION;
  alg: typeof AES_256_GCM_ALGORITHM;
  kid: string;
  keyWrapAlg: string;
  encryptedDataKey: string;
  iv: string;
  tag: string;
  ciphertext: string;
  context?: NormalizedEncryptionContext;
}

export interface LocalEnvelopeKeyProviderOptions {
  keyId: string;
  masterKey: Uint8Array;
}

interface WrappedLocalDataKey {
  v: typeof ENCRYPTED_PAYLOAD_VERSION;
  alg: typeof LOCAL_KEY_WRAP_ALGORITHM;
  iv: string;
  tag: string;
  ciphertext: string;
}

export const normalizeEncryptionContext = (
  context: EncryptionContext = {},
): NormalizedEncryptionContext => {
  const normalized: NormalizedEncryptionContext = {};

  for (const key of Object.keys(context).sort()) {
    const value = context[key];
    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return normalized;
};

export const stableSerializeEncryptionContext = (
  context: EncryptionContext = {},
) => JSON.stringify(normalizeEncryptionContext(context));

export const encodeBase64 = (value: Uint8Array) =>
  Buffer.from(value).toString('base64');

export const decodeBase64 = (value: string) => {
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length === 0 && value.length > 0) {
    throw new Error('Invalid base64 value.');
  }
  return decoded;
};

export const assertAes256Key = (key: Uint8Array, label = 'key'): void => {
  if (key.byteLength !== aes256KeyBytes) {
    throw new Error(`${label} must be exactly 32 bytes for AES-256-GCM.`);
  }
};

export const generateAes256Key = () => randomBytes(aes256KeyBytes);

export const encodeLocalMasterKey = (key: Uint8Array) => {
  assertAes256Key(key, 'local master key');
  return encodeBase64(key);
};

export const decodeLocalMasterKey = (base64Key: string) => {
  const key = decodeBase64(base64Key);
  assertAes256Key(key, 'local master key');
  return key;
};

export class LocalEnvelopeKeyProvider implements EnvelopeKeyProvider {
  readonly keyId: string;

  readonly #masterKey: Uint8Array;

  constructor(options: LocalEnvelopeKeyProviderOptions) {
    if (!options.keyId.trim()) {
      throw new Error(
        'Local envelope key provider requires a non-empty keyId.',
      );
    }

    assertAes256Key(options.masterKey, 'local master key');
    this.keyId = options.keyId;
    this.#masterKey = Buffer.from(options.masterKey);
  }

  async generateDataKey(
    context?: EncryptionContext,
  ): Promise<GeneratedDataKey> {
    const plaintextKey = generateAes256Key();
    const encryptedDataKey = this.#wrapDataKey(plaintextKey, context);

    return {
      plaintextKey,
      encryptedDataKey,
      keyId: this.keyId,
      keyWrapAlg: LOCAL_KEY_WRAP_ALGORITHM,
    };
  }

  async decryptDataKey(
    wrappedDataKey: WrappedDataKey,
    context?: EncryptionContext,
  ) {
    if (wrappedDataKey.keyId !== this.keyId) {
      throw new Error('Encrypted data key was wrapped by a different key id.');
    }
    if (wrappedDataKey.keyWrapAlg !== LOCAL_KEY_WRAP_ALGORITHM) {
      throw new Error('Unsupported local key wrap algorithm.');
    }

    const wrapped = parseWrappedLocalDataKey(wrappedDataKey.encryptedDataKey);
    const aad = buildAad(context);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.#masterKey,
      decodeBase64(wrapped.iv),
    );
    decipher.setAAD(aad);
    decipher.setAuthTag(decodeBase64(wrapped.tag));

    const plaintext = Buffer.concat([
      decipher.update(decodeBase64(wrapped.ciphertext)),
      decipher.final(),
    ]);
    assertAes256Key(plaintext, 'unwrapped data key');
    return plaintext;
  }

  #wrapDataKey(dataKey: Uint8Array, context?: EncryptionContext) {
    assertAes256Key(dataKey, 'data key');

    const iv = randomBytes(gcmIvBytes);
    const cipher = createCipheriv('aes-256-gcm', this.#masterKey, iv);
    cipher.setAAD(buildAad(context));

    const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    const wrapped: WrappedLocalDataKey = {
      v: ENCRYPTED_PAYLOAD_VERSION,
      alg: LOCAL_KEY_WRAP_ALGORITHM,
      iv: encodeBase64(iv),
      tag: encodeBase64(cipher.getAuthTag()),
      ciphertext: encodeBase64(ciphertext),
    };

    return encodeBase64(Buffer.from(JSON.stringify(wrapped), 'utf8'));
  }
}

export const createLocalEnvelopeKeyProviderFromBase64 = (
  keyId: string,
  base64Key: string,
) =>
  new LocalEnvelopeKeyProvider({
    keyId,
    masterKey: decodeLocalMasterKey(base64Key),
  });

export const encryptBytes = async (
  plaintext: Uint8Array,
  keyProvider: EnvelopeKeyProvider,
  context?: EncryptionContext,
): Promise<EncryptedPayloadV1> => {
  const normalizedContext = normalizeEncryptionContext(context);
  const dataKey = await keyProvider.generateDataKey(normalizedContext);

  try {
    assertAes256Key(dataKey.plaintextKey, 'data key');

    const iv = randomBytes(gcmIvBytes);
    const cipher = createCipheriv('aes-256-gcm', dataKey.plaintextKey, iv);
    cipher.setAAD(buildAad(normalizedContext));

    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);

    return {
      v: ENCRYPTED_PAYLOAD_VERSION,
      alg: AES_256_GCM_ALGORITHM,
      kid: dataKey.keyId,
      keyWrapAlg: dataKey.keyWrapAlg,
      encryptedDataKey: dataKey.encryptedDataKey,
      iv: encodeBase64(iv),
      tag: encodeBase64(cipher.getAuthTag()),
      ciphertext: encodeBase64(ciphertext),
      context:
        Object.keys(normalizedContext).length > 0
          ? normalizedContext
          : undefined,
    };
  } finally {
    dataKey.plaintextKey.fill(0);
  }
};

export const decryptBytes = async (
  payload: EncryptedPayloadV1,
  keyProvider: EnvelopeKeyProvider,
  context?: EncryptionContext,
) => {
  assertEncryptedPayload(payload);

  const normalizedContext =
    context === undefined
      ? payload.context
      : normalizeEncryptionContext(context);
  const dataKey = await keyProvider.decryptDataKey(
    {
      encryptedDataKey: payload.encryptedDataKey,
      keyId: payload.kid,
      keyWrapAlg: payload.keyWrapAlg,
    },
    normalizedContext,
  );

  try {
    assertAes256Key(dataKey, 'data key');

    const decipher = createDecipheriv(
      'aes-256-gcm',
      dataKey,
      decodeBase64(payload.iv),
    );
    decipher.setAAD(buildAad(normalizedContext));
    decipher.setAuthTag(decodeBase64(payload.tag));

    return Buffer.concat([
      decipher.update(decodeBase64(payload.ciphertext)),
      decipher.final(),
    ]);
  } finally {
    dataKey.fill(0);
  }
};

export const encryptUtf8 = async (
  plaintext: string,
  keyProvider: EnvelopeKeyProvider,
  context?: EncryptionContext,
) => encryptBytes(Buffer.from(plaintext, 'utf8'), keyProvider, context);

export const decryptUtf8 = async (
  payload: EncryptedPayloadV1,
  keyProvider: EnvelopeKeyProvider,
  context?: EncryptionContext,
) => {
  const plaintext = await decryptBytes(payload, keyProvider, context);
  return plaintext.toString('utf8');
};

export const assertEncryptedPayload = (payload: EncryptedPayloadV1): void => {
  if (payload.v !== ENCRYPTED_PAYLOAD_VERSION) {
    throw new Error('Unsupported encrypted payload version.');
  }
  if (payload.alg !== AES_256_GCM_ALGORITHM) {
    throw new Error('Unsupported encrypted payload algorithm.');
  }
  if (!payload.kid.trim()) {
    throw new Error('Encrypted payload is missing key id.');
  }
  if (!payload.encryptedDataKey.trim()) {
    throw new Error('Encrypted payload is missing encrypted data key.');
  }
  if (decodeBase64(payload.iv).length !== gcmIvBytes) {
    throw new Error('Encrypted payload IV must be 12 bytes.');
  }
  if (decodeBase64(payload.tag).length !== gcmTagBytes) {
    throw new Error('Encrypted payload authentication tag must be 16 bytes.');
  }
  if (decodeBase64(payload.ciphertext).length < 1) {
    throw new Error('Encrypted payload ciphertext is empty.');
  }
};

const buildAad = (context: EncryptionContext = {}) =>
  Buffer.from(
    JSON.stringify({
      v: ENCRYPTED_PAYLOAD_VERSION,
      alg: AES_256_GCM_ALGORITHM,
      context: normalizeEncryptionContext(context),
    }),
    'utf8',
  );

const parseWrappedLocalDataKey = (encryptedDataKey: string) => {
  const decoded = decodeBase64(encryptedDataKey).toString('utf8');
  const parsed = JSON.parse(decoded) as WrappedLocalDataKey;

  if (parsed.v !== ENCRYPTED_PAYLOAD_VERSION) {
    throw new Error('Unsupported wrapped data key version.');
  }
  if (parsed.alg !== LOCAL_KEY_WRAP_ALGORITHM) {
    throw new Error('Unsupported wrapped data key algorithm.');
  }
  if (decodeBase64(parsed.iv).length !== gcmIvBytes) {
    throw new Error('Wrapped data key IV must be 12 bytes.');
  }
  if (decodeBase64(parsed.tag).length !== gcmTagBytes) {
    throw new Error('Wrapped data key tag must be 16 bytes.');
  }

  return parsed;
};

export const constantTimeEqual = (left: Uint8Array, right: Uint8Array) =>
  left.byteLength === right.byteLength &&
  timingSafeEqual(Buffer.from(left), Buffer.from(right));
