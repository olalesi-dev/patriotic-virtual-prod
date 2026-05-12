export interface SendTelnyxSmsInput {
  recipientId: string;
  to: string;
  text: string;
}

export interface SendTelnyxSmsResult {
  providerMessageId?: string;
  providerResponseCode?: string;
}

const telnyxMessagesUrl = 'https://api.telnyx.com/v2/messages';
const defaultTelnyxFromNumber = '+13056862017';

export const normalizeSmsPhoneNumber = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return trimmed;
};

const readTelnyxApiKey = (): string | undefined =>
  process.env.TELNYX_API_KEY?.trim() ||
  process.env.TELNYX_SECRET_KEY?.trim() ||
  undefined;

const readTelnyxFromNumber = (): string =>
  process.env.TELNYX_FROM_NUMBER?.trim() || defaultTelnyxFromNumber;

export const sendTelnyxSms = async ({
  recipientId,
  to,
  text,
}: SendTelnyxSmsInput): Promise<SendTelnyxSmsResult> => {
  const apiKey = readTelnyxApiKey();
  if (!apiKey) {
    throw new Error('TELNYX_API_KEY is required to send SMS notifications.');
  }

  const body: Record<string, string> = {
    from: readTelnyxFromNumber(),
    to: normalizeSmsPhoneNumber(to),
    text,
  };

  const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID?.trim();
  if (messagingProfileId) {
    body.messaging_profile_id = messagingProfileId;
  }

  const response = await fetch(telnyxMessagesUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => undefined)) as
    | { data?: { id?: string }; errors?: { detail?: string; title?: string }[] }
    | undefined;

  if (!response.ok) {
    const details =
      payload?.errors
        ?.map((error) => error.detail || error.title)
        .filter(Boolean)
        .join('; ') || response.statusText;
    throw new Error(
      `Telnyx SMS failed for ${recipientId}: ${response.status} ${details}`,
    );
  }

  return {
    providerMessageId: payload?.data?.id,
    providerResponseCode: String(response.status),
  };
};
