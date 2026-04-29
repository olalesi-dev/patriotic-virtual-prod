import { createVerify } from 'node:crypto';

const SIGNATURE_HEADER = 'x-twilio-email-event-webhook-signature';
const TIMESTAMP_HEADER = 'x-twilio-email-event-webhook-timestamp';

function asNonEmptyString(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizePublicKey(publicKey: string): string {
  const trimmed = publicKey.trim();
  if (trimmed.includes('BEGIN PUBLIC KEY')) {
    return trimmed;
  }

  const compact = trimmed.replace(/\s+/g, '');
  const chunks = compact.match(/.{1,64}/g) ?? [compact];
  return `-----BEGIN PUBLIC KEY-----\n${chunks.join(
    '\n',
  )}\n-----END PUBLIC KEY-----`;
}

export function getSendGridWebhookVerificationKey(): string | null {
  return asNonEmptyString(process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY);
}

export function isSendGridWebhookVerificationEnabled(): boolean {
  return Boolean(getSendGridWebhookVerificationKey());
}

export function verifySendGridWebhookSignature(input: {
  payload: Buffer;
  signatureHeader: string | null | undefined;
  timestampHeader: string | null | undefined;
  verificationKey?: string | null;
}): boolean {
  const verificationKey = asNonEmptyString(
    input.verificationKey ?? getSendGridWebhookVerificationKey(),
  );
  const signature = asNonEmptyString(input.signatureHeader);
  const timestamp = asNonEmptyString(input.timestampHeader);

  if (!verificationKey || !signature || !timestamp) {
    return false;
  }

  try {
    const verifier = createVerify('sha256');
    verifier.update(
      Buffer.concat([Buffer.from(timestamp, 'utf8'), input.payload]),
    );
    verifier.end();

    return verifier.verify(
      normalizePublicKey(verificationKey),
      Buffer.from(signature, 'base64'),
    );
  } catch {
    return false;
  }
}

export function getSendGridWebhookSignatureHeaders(
  headers: Record<string, unknown>,
): {
  signature: string | null;
  timestamp: string | null;
} {
  const readHeader = (name: string): string | null => {
    const value = headers[name.toLowerCase()] ?? headers[name];
    if (typeof value === 'string') return asNonEmptyString(value);
    if (Array.isArray(value)) {
      const first = value.find(
        (entry): entry is string => typeof entry === 'string',
      );
      return asNonEmptyString(first ?? null);
    }
    return null;
  };

  return {
    signature: readHeader(SIGNATURE_HEADER),
    timestamp: readHeader(TIMESTAMP_HEADER),
  };
}
