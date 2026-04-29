import crypto from 'node:crypto';
import { env as globalEnv } from '@workspace/env';

export interface DoseSpotConfig {
  clinicId?: string;
  clinicKey?: string;
  userId?: string;
  baseUrl?: string;
  subscriptionKey?: string;
}

export const dosespotConfig: DoseSpotConfig = {
  get clinicId() {
    return this._clinicId ?? globalEnv.DOSESPOT_CLINIC_ID;
  },
  set clinicId(v) {
    this._clinicId = v;
  },
  get clinicKey() {
    return this._clinicKey ?? globalEnv.DOSESPOT_CLINIC_KEY;
  },
  set clinicKey(v) {
    this._clinicKey = v;
  },
  get userId() {
    return this._userId ?? globalEnv.DOSESPOT_USER_ID;
  },
  set userId(v) {
    this._userId = v;
  },
  get baseUrl() {
    return this._baseUrl ?? globalEnv.DOSESPOT_BASE_URL;
  },
  set baseUrl(v) {
    this._baseUrl = v;
  },
  get subscriptionKey() {
    return this._subscriptionKey ?? globalEnv.DOSESPOT_SUBSCRIPTION_KEY;
  },
  set subscriptionKey(v) {
    this._subscriptionKey = v;
  },
} as DoseSpotConfig & {
  _clinicId?: string;
  _clinicKey?: string;
  _userId?: string;
  _baseUrl?: string;
  _subscriptionKey?: string;
};

function generatePhrase(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(32);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

function stripDoseSpotPadding(value: string): string {
  return value.endsWith('==') ? value.slice(0, -2) : value;
}

function normalizeConfigValue(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing ${name} config`);
  }
  return normalized;
}

function generateEncryptedClinicId(clinicKey: string, phrase: string): string {
  const raw = phrase + clinicKey;
  const hash = crypto
    .createHash('sha512')
    .update(Buffer.from(raw, 'utf8'))
    .digest();
  const hashB64 = stripDoseSpotPadding(hash.toString('base64'));
  const result = phrase + hashB64;
  return encodeURIComponent(result);
}

function generateEncryptedUserId(
  userId: string,
  clinicKey: string,
  phrase: string,
): string {
  const phrase22 = phrase.slice(0, 22);
  const raw = userId + phrase22 + clinicKey;
  const hash = crypto
    .createHash('sha512')
    .update(Buffer.from(raw, 'utf8'))
    .digest();
  const hashB64 = stripDoseSpotPadding(hash.toString('base64'));
  return encodeURIComponent(hashB64);
}

export interface SSOUrlParams {
  clinicianDoseSpotId: number;
  patientDoseSpotId?: number;
  onBehalfOfUserId?: number;
  encounterId?: string;
  refillsErrors?: boolean;
}

export function generateSSOUrl(params: SSOUrlParams): string {
  const clinicId = normalizeConfigValue(
    dosespotConfig.clinicId,
    'DOSESPOT_CLINIC_ID',
  );
  const clinicKey = normalizeConfigValue(
    dosespotConfig.clinicKey,
    'DOSESPOT_CLINIC_KEY',
  );
  const baseUrl = normalizeConfigValue(
    dosespotConfig.baseUrl,
    'DOSESPOT_BASE_URL',
  ).replace(/\/+$/, '');

  const phrase = generatePhrase();
  const ssoCode = generateEncryptedClinicId(clinicKey, phrase);
  const ssoUserVerify = generateEncryptedUserId(
    params.clinicianDoseSpotId.toString(),
    clinicKey,
    phrase,
  );

  const parts: string[] = [
    `SingleSignOnClinicId=${encodeURIComponent(clinicId)}`,
    `SingleSignOnUserId=${encodeURIComponent(
      params.clinicianDoseSpotId.toString(),
    )}`,
    `SingleSignOnPhraseLength=32`,
    `SingleSignOnCode=${ssoCode}`,
    `SingleSignOnUserIdVerify=${ssoUserVerify}`,
  ];

  if (params.patientDoseSpotId) {
    parts.push(
      `PatientId=${encodeURIComponent(params.patientDoseSpotId.toString())}`,
    );
  }

  if (params.onBehalfOfUserId) {
    parts.push(
      `OnBehalfOfUserId=${encodeURIComponent(
        params.onBehalfOfUserId.toString(),
      )}`,
    );
  }

  if (params.encounterId) {
    parts.push(`EncounterID=${encodeURIComponent(params.encounterId)}`);
  }

  if (params.refillsErrors) {
    const idx = parts.findIndex((p) => p.startsWith('PatientId='));
    if (idx !== -1) parts.splice(idx, 1);
    parts.push('RefillsErrors=1');
  }

  return `${baseUrl}/LoginSingleSignOn.aspx?${parts.join('&')}`;
}

export async function getDoseSpotAccessToken(
  clinicianIdForRestAuth?: number,
): Promise<string> {
  const clinicId = normalizeConfigValue(
    dosespotConfig.clinicId,
    'DOSESPOT_CLINIC_ID',
  );
  const clinicKey = normalizeConfigValue(
    dosespotConfig.clinicKey,
    'DOSESPOT_CLINIC_KEY',
  );
  const userId = normalizeConfigValue(dosespotConfig.userId, 'DOSESPOT_USER_ID');
  const baseUrl = normalizeConfigValue(
    dosespotConfig.baseUrl,
    'DOSESPOT_BASE_URL',
  ).replace(/\/+$/, '');
  const subscriptionKey = dosespotConfig.subscriptionKey;

  const fetchToken = async (usernameOverride?: string): Promise<string> => {
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: clinicId,
      client_secret: clinicKey,
      username: usernameOverride ?? userId,
      password: clinicKey,
      scope: 'api',
    });

    const response = await fetch(`${baseUrl}/webapi/v2/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(subscriptionKey ? { 'Subscription-Key': subscriptionKey } : {}),
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const responseText = (await response.text()).trim();
      const extra = responseText ? ` - ${responseText.slice(0, 240)}` : '';
      throw new Error(
        `DoseSpot token fetch failed: ${response.status} ${response.statusText}${extra}`,
      );
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error(
        'DoseSpot token fetch failed: Missing access_token in response.',
      );
    }

    return data.access_token;
  };

  return fetchToken(clinicianIdForRestAuth?.toString());
}
