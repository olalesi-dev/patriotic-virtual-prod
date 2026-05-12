/* eslint-disable id-length */

export const CLIENT_E2EE_PAYLOAD_VERSION = 1 as const;
export const CLIENT_E2EE_MODE = 'client_e2ee' as const;
export const CLIENT_E2EE_CONTENT_ALGORITHM = 'AES-256-GCM' as const;

const gcmIvBytes = 12;
const gcmTagBytes = 16;

export interface ClientEncryptedRecipient {
  userId: string;
  keyId: string;
  wrapAlg: string;
  wrappedContentKey: string;
}

export interface ClientEncryptedPayloadV1 {
  v: typeof CLIENT_E2EE_PAYLOAD_VERSION;
  mode: typeof CLIENT_E2EE_MODE;
  alg: typeof CLIENT_E2EE_CONTENT_ALGORITHM;
  iv: string;
  tag: string;
  ciphertext: string;
  recipients: ClientEncryptedRecipient[];
  aad?: Record<string, string>;
}

export interface RedactedClientEncryptedPayload {
  v: typeof CLIENT_E2EE_PAYLOAD_VERSION;
  mode: typeof CLIENT_E2EE_MODE;
  alg: typeof CLIENT_E2EE_CONTENT_ALGORITHM;
  recipientCount: number;
  keyIds: string[];
}

const forbiddenPlaintextFields = new Set([
  'body',
  'content',
  'document',
  'file',
  'html',
  'message',
  'plaintext',
  'subject',
  'text',
  'title',
]);

export const assertClientEncryptedPayload = (
  input: unknown,
): ClientEncryptedPayloadV1 => {
  if (!isObject(input)) {
    throw new Error('Client encrypted payload must be an object.');
  }

  rejectPlaintextFields(input);

  if (input.v !== CLIENT_E2EE_PAYLOAD_VERSION) {
    throw new Error('Unsupported client encrypted payload version.');
  }
  if (input.mode !== CLIENT_E2EE_MODE) {
    throw new Error('Client encrypted payload must use client_e2ee mode.');
  }
  if (input.alg !== CLIENT_E2EE_CONTENT_ALGORITHM) {
    throw new Error('Client encrypted payload must use AES-256-GCM.');
  }
  if (!isBase64WithLength(input.iv, gcmIvBytes)) {
    throw new Error('Client encrypted payload IV must be 12 bytes.');
  }
  if (!isBase64WithLength(input.tag, gcmTagBytes)) {
    throw new Error('Client encrypted payload tag must be 16 bytes.');
  }
  if (!isNonEmptyBase64(input.ciphertext)) {
    throw new Error('Client encrypted payload ciphertext is required.');
  }
  if (!Array.isArray(input.recipients) || input.recipients.length === 0) {
    throw new Error('Client encrypted payload needs at least one recipient.');
  }

  const recipients = input.recipients.map(assertClientEncryptedRecipient);
  const aad = assertAad(input.aad);

  return {
    v: CLIENT_E2EE_PAYLOAD_VERSION,
    mode: CLIENT_E2EE_MODE,
    alg: CLIENT_E2EE_CONTENT_ALGORITHM,
    iv: input.iv as string,
    tag: input.tag as string,
    ciphertext: input.ciphertext as string,
    recipients,
    aad,
  };
};

export const redactClientEncryptedPayload = (
  payload: ClientEncryptedPayloadV1,
): RedactedClientEncryptedPayload => ({
  v: payload.v,
  mode: payload.mode,
  alg: payload.alg,
  recipientCount: payload.recipients.length,
  keyIds: [...new Set(payload.recipients.map((recipient) => recipient.keyId))],
});

export const getClientEncryptedRecipients = (
  payload: ClientEncryptedPayloadV1,
) => payload.recipients;

const assertClientEncryptedRecipient = (
  input: unknown,
): ClientEncryptedRecipient => {
  if (!isObject(input)) {
    throw new Error('Client encrypted recipient must be an object.');
  }

  const { userId, keyId, wrapAlg, wrappedContentKey } = input;
  if (!isNonEmptyString(userId)) {
    throw new Error('Client encrypted recipient userId is required.');
  }
  if (!isNonEmptyString(keyId)) {
    throw new Error('Client encrypted recipient keyId is required.');
  }
  if (!isNonEmptyString(wrapAlg)) {
    throw new Error('Client encrypted recipient wrapAlg is required.');
  }
  if (!isNonEmptyBase64(wrappedContentKey)) {
    throw new Error(
      'Client encrypted recipient wrappedContentKey is required.',
    );
  }

  return { userId, keyId, wrapAlg, wrappedContentKey };
};

const assertAad = (input: unknown) => {
  if (input === undefined) {
    return undefined;
  }
  if (!isObject(input)) {
    throw new Error('Client encrypted payload aad must be an object.');
  }

  const aad: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!isNonEmptyString(value)) {
      throw new Error('Client encrypted payload aad values must be strings.');
    }
    aad[key] = value;
  }
  return aad;
};

const rejectPlaintextFields = (input: Record<string, unknown>) => {
  for (const field of Object.keys(input)) {
    if (forbiddenPlaintextFields.has(field.toLowerCase())) {
      throw new Error(
        `Client encrypted payload cannot include plaintext field "${field}".`,
      );
    }
  }
};

const isObject = (input: unknown): input is Record<string, unknown> =>
  typeof input === 'object' && input !== null && !Array.isArray(input);

const isNonEmptyString = (input: unknown): input is string =>
  typeof input === 'string' && input.trim().length > 0;

const isNonEmptyBase64 = (input: unknown): input is string => {
  if (!isNonEmptyString(input)) {
    return false;
  }
  try {
    return Buffer.from(input, 'base64').length > 0;
  } catch {
    return false;
  }
};

const isBase64WithLength = (input: unknown, byteLength: number) => {
  if (!isNonEmptyString(input)) {
    return false;
  }
  try {
    return Buffer.from(input, 'base64').length === byteLength;
  } catch {
    return false;
  }
};
