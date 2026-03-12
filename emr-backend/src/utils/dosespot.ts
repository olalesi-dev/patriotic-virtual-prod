import crypto from 'crypto';

// ─── Credentials from environment ───────────────────────────────────────────
// Set these in Cloud Run / .env:
//   DOSESPOT_CLINIC_ID   = 1007159
//   DOSESPOT_CLINIC_KEY  = HPHH63FJA79VHFQQ5S4UR2K9JMVTF2N9
//   DOSESPOT_USER_ID     = 3088396   (the "system" clinician / proxy admin)
//   DOSESPOT_BASE_URL    = https://my.staging.dosespot.com

// FIRESTORE DEPENDENCY:
// Reads doseSpotClinicianId (integer) from /users/{uid}
// Set this field when creating a provider via POST /api/v1/admin/users
// or manually: db.collection('users').doc(uid).set({ doseSpotClinicianId: 3088396 }, { merge: true })
// The staging test clinician ID is: 3088396

// ─── Step A: 32-char alphanumeric phrase ─────────────────────────────────────
function generatePhrase(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(32);
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

/**
 * SingleSignOnCode  (Encrypted Clinic ID)
 * ─────────────────────────────────────────────────────────────────────────────
 * Per DoseSpot Integration Guide p.6:
 *   Step 1.  raw    = phrase + clinicKey
 *   Step 2.  hash   = SHA512( UTF8(raw) )
 *   Step 3.  hashB64 = Base64( hash )
 *   Step 4.  Strip ALL trailing '=' from hashB64
 *   Step 5.  result  = phrase + hashB64
 *   Step 6.  Return URL-encoded result
 */
function generateEncryptedClinicId(clinicKey: string, phrase: string): string {
    const raw     = phrase + clinicKey;
    const hash    = crypto.createHash('sha512').update(Buffer.from(raw, 'utf8')).digest();
    const hashB64 = hash.toString('base64').replace(/=+$/, '');
    const result  = phrase + hashB64;
    return encodeURIComponent(result);
}

/**
 * SingleSignOnUserIdVerify  (Encrypted User ID)
 * ─────────────────────────────────────────────────────────────────────────────
 * Per DoseSpot Integration Guide p.6:
 *   Step 1. phrase22 = first 22 chars of phrase
 *   Step 2. raw      = userId + phrase22 + clinicKey
 *   Step 3. hash     = SHA512( UTF8(raw) )
 *   Step 4. hashB64  = Base64( hash )
 *   Step 5. Strip ALL trailing '=' from hashB64
 *   Step 6. Return URL-encoded hashB64  (no phrase prefix here)
 */
function generateEncryptedUserId(userId: string, clinicKey: string, phrase: string): string {
    const phrase22 = phrase.slice(0, 22);
    const raw      = userId + phrase22 + clinicKey;
    const hash     = crypto.createHash('sha512').update(Buffer.from(raw, 'utf8')).digest();
    const hashB64  = hash.toString('base64').replace(/=+$/, '');
    return encodeURIComponent(hashB64);
}

/**
 * Build the DoseSpot SSO URL
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANT: we build the query string MANUALLY (not via URLSearchParams) to
 * avoid double-encoding the already URL-encoded encrypted values.
 *
 * Query parameters (from guide):
 *   SingleSignOnClinicId      – integer clinic ID
 *   SingleSignOnUserId        – integer clinician ID
 *   SingleSignOnPhraseLength  – 32 (always)
 *   SingleSignOnCode          – URL-encoded encrypted clinic ID
 *   SingleSignOnUserIdVerify  – URL-encoded encrypted user ID
 *   PatientId                 – (optional) patient's DoseSpot ID
 *   RefillsErrors             – (optional, mutually exclusive with PatientId)
 */
export function generateSSOUrl(params: {
    clinicianDoseSpotId: number;
    patientDoseSpotId?: number;
    refillsErrors?: boolean;
}): string {
    const clinicId  = process.env.DOSESPOT_CLINIC_ID!;
    const clinicKey = process.env.DOSESPOT_CLINIC_KEY!;
    const baseUrl   = process.env.DOSESPOT_BASE_URL!;

    if (!clinicId || !clinicKey || !baseUrl) {
        throw new Error('Missing DOSESPOT_CLINIC_ID, DOSESPOT_CLINIC_KEY, or DOSESPOT_BASE_URL env vars');
    }

    const phrase        = generatePhrase();
    const ssoCode       = generateEncryptedClinicId(clinicKey, phrase);       // already URL-encoded
    const ssoUserVerify = generateEncryptedUserId(
        params.clinicianDoseSpotId.toString(),
        clinicKey,
        phrase
    );                                                                          // already URL-encoded

    // Build query string manually – these values are already encoded, so we
    // must NOT pass them through URLSearchParams (which would double-encode).
    const parts: string[] = [
        `SingleSignOnClinicId=${encodeURIComponent(clinicId)}`,
        `SingleSignOnUserId=${encodeURIComponent(params.clinicianDoseSpotId.toString())}`,
        `SingleSignOnPhraseLength=32`,
        `SingleSignOnCode=${ssoCode}`,
        `SingleSignOnUserIdVerify=${ssoUserVerify}`,
    ];

    if (params.patientDoseSpotId) {
        parts.push(`PatientId=${encodeURIComponent(params.patientDoseSpotId.toString())}`);
    }

    if (params.refillsErrors) {
        // Refills/Errors mode is mutually exclusive with PatientId
        const idx = parts.findIndex(p => p.startsWith('PatientId='));
        if (idx !== -1) parts.splice(idx, 1);
        parts.push('RefillsErrors=1');
    }

    return `${baseUrl}/LoginSingleSignOn.aspx?${parts.join('&')}`;
}

// ─── OAuth2 access-token helper (for REST API calls, not SSO) ────────────────
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

export async function getDoseSpotAccessToken(onBehalfOfClinicianId?: number): Promise<string> {
    // Return cached token if still valid (with 60 s safety buffer)
    if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
        return tokenCache.accessToken;
    }

    const params = new URLSearchParams({
        grant_type:    'password',
        client_id:     process.env.DOSESPOT_CLINIC_ID!,
        client_secret: process.env.DOSESPOT_CLINIC_KEY!,
        username:      process.env.DOSESPOT_USER_ID!,
        password:      process.env.DOSESPOT_CLINIC_KEY!,
        scope:         'api',
    });

    if (onBehalfOfClinicianId) {
        params.set('acr_values', `OnBehalfOfUserId=${onBehalfOfClinicianId}`);
    }

    const response = await fetch(`${process.env.DOSESPOT_BASE_URL}/webapi/v2/connect/token`, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(process.env.DOSESPOT_SUBSCRIPTION_KEY
                ? { 'Subscription-Key': process.env.DOSESPOT_SUBSCRIPTION_KEY }
                : {}),
        },
        body: params.toString(),
    });

    if (!response.ok) {
        throw new Error(`DoseSpot token fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    tokenCache = {
        accessToken: data.access_token,
        expiresAt:   Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
}
