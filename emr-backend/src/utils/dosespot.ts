import crypto from 'crypto';

// ─── Credentials from environment ───────────────────────────────────────────
// Set these in Cloud Run / .env:
//   DOSESPOT_CLINIC_ID   = 1007159
//   DOSESPOT_CLINIC_KEY  = HPHH63FJA79VHFQQ5S4UR2K9JMVTF2N9
//   DOSESPOT_USER_ID     = 3088396   (the "system" clinician / proxy admin)
//   DOSESPOT_DEFAULT_CLINICIAN_ID = 3088396   (used only for patient REST flows when no provider clinician is available)
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

function stripDoseSpotPadding(value: string): string {
    return value.endsWith('==') ? value.slice(0, -2) : value;
}

function normalizeEnvValue(value: string | undefined, name: string): string {
    const normalized = value?.trim();
    if (!normalized) {
        throw new Error(`Missing ${name} env var`);
    }
    return normalized;
}

/**
 * SingleSignOnCode  (Encrypted Clinic ID)
 * ─────────────────────────────────────────────────────────────────────────────
 * Per DoseSpot Integration Guide p.6:
 *   Step 1.  raw     = phrase + clinicKey
 *   Step 2.  hash    = SHA512( UTF8(raw) )
 *   Step 3.  hashB64 = Base64( hash )
 *   Step 4.  Strip ALL trailing '=' from hashB64
 *   Step 5.  result  = phrase + hashB64
 *   Step 6.  Return URL-encoded result
 */
function generateEncryptedClinicId(clinicKey: string, phrase: string): string {
    const raw     = phrase + clinicKey;
    const hash    = crypto.createHash('sha512').update(Buffer.from(raw, 'utf8')).digest();
    const hashB64 = stripDoseSpotPadding(hash.toString('base64'));
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
    const hashB64  = stripDoseSpotPadding(hash.toString('base64'));
    return encodeURIComponent(hashB64);
}

/**
 * Build the DoseSpot SSO URL
 * ─────────────────────────────────────────────────────────────────────────────
 * Full URL format (from DoseSpot Integration Guide):
 *
 *   /LoginSingleSignOn.aspx
 *     ?SingleSignOnClinicId     = {ClinicId}
 *     &SingleSignOnUserId       = {ClinicianId}          ← the signing user (admin or clinician)
 *     &SingleSignOnPhraseLength = 32
 *     &SingleSignOnCode         = {EncryptedClinicId}
 *     &SingleSignOnUserIdVerify = {EncryptedUserId}
 *     &PatientId                = {PatientId}            ← (optional) open directly to a patient
 *     &OnBehalfOfUserId         = {ClinicianId}          ← (optional) prescribe on behalf of clinician
 *     &EncounterID              = {EncounterID}          ← (optional) link to a specific encounter
 *     &RefillsErrors            = 1                      ← (optional, mutually exclusive w/ PatientId)
 *
 * IMPORTANT: query string is built MANUALLY to avoid double-encoding the
 * already URL-encoded encrypted values (URLSearchParams would double-encode).
 *
 * OnBehalfOfUserId: Used when the SSO signing user is an admin/system account
 * but the actual prescribing clinician is different. Both SingleSignOnUserId
 * and OnBehalfOfUserId are typically set to the same clinicianDoseSpotId
 * unless you are using a shared admin account to sign on behalf of others.
 */
export function generateSSOUrl(params: {
    clinicianDoseSpotId: number;      // The clinician who will be logged in
    patientDoseSpotId?: number;        // Open directly to a patient's chart
    onBehalfOfUserId?: number;         // Prescribe on behalf of this clinician ID
    encounterId?: string;              // Link to a specific consult/encounter
    refillsErrors?: boolean;           // Open the Refills & Errors view
}): string {
    const clinicId  = normalizeEnvValue(process.env.DOSESPOT_CLINIC_ID, 'DOSESPOT_CLINIC_ID');
    const clinicKey = normalizeEnvValue(process.env.DOSESPOT_CLINIC_KEY, 'DOSESPOT_CLINIC_KEY');
    const baseUrl   = normalizeEnvValue(process.env.DOSESPOT_BASE_URL, 'DOSESPOT_BASE_URL').replace(/\/+$/, '');

    const phrase        = generatePhrase();
    const ssoCode       = generateEncryptedClinicId(clinicKey, phrase);
    const ssoUserVerify = generateEncryptedUserId(
        params.clinicianDoseSpotId.toString(),
        clinicKey,
        phrase
    );

    // Core required parameters — build manually to avoid double-encoding
    const parts: string[] = [
        `SingleSignOnClinicId=${encodeURIComponent(clinicId)}`,
        `SingleSignOnUserId=${encodeURIComponent(params.clinicianDoseSpotId.toString())}`,
        `SingleSignOnPhraseLength=32`,
        `SingleSignOnCode=${ssoCode}`,
        `SingleSignOnUserIdVerify=${ssoUserVerify}`,
    ];

    // Optional: open directly to a patient's chart
    if (params.patientDoseSpotId) {
        parts.push(`PatientId=${encodeURIComponent(params.patientDoseSpotId.toString())}`);
    }

    // Optional: prescribe on behalf of a different clinician
    // (used when signing in as admin/system but writing Rx for a specific prescriber)
    if (params.onBehalfOfUserId) {
        parts.push(`OnBehalfOfUserId=${encodeURIComponent(params.onBehalfOfUserId.toString())}`);
    }

    // Optional: link the session to a specific encounter/consultation
    if (params.encounterId) {
        parts.push(`EncounterID=${encodeURIComponent(params.encounterId)}`);
    }

    // Optional: open Refills & Errors view (mutually exclusive with PatientId)
    if (params.refillsErrors) {
        const idx = parts.findIndex(p => p.startsWith('PatientId='));
        if (idx !== -1) parts.splice(idx, 1); // remove PatientId if present
        parts.push('RefillsErrors=1');
    }

    return `${baseUrl}/LoginSingleSignOn.aspx?${parts.join('&')}`;
}

// ─── OAuth2 access-token helper (for REST API calls, not SSO) ────────────────
export async function getDoseSpotAccessToken(clinicianIdForRestAuth?: number): Promise<string> {
    const fetchToken = async (usernameOverride?: string): Promise<string> => {
        const params = new URLSearchParams({
            grant_type: 'password',
            client_id: process.env.DOSESPOT_CLINIC_ID!,
            client_secret: process.env.DOSESPOT_CLINIC_KEY!,
            username: usernameOverride ?? process.env.DOSESPOT_USER_ID!,
            password: process.env.DOSESPOT_CLINIC_KEY!,
            scope: 'api',
        });

        const response = await fetch(`${process.env.DOSESPOT_BASE_URL}/webapi/v2/connect/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(process.env.DOSESPOT_SUBSCRIPTION_KEY
                    ? { 'Subscription-Key': process.env.DOSESPOT_SUBSCRIPTION_KEY }
                    : {}),
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const responseText = (await response.text()).trim();
            const extra = responseText ? ` - ${responseText.slice(0, 240)}` : '';
            throw new Error(`DoseSpot token fetch failed: ${response.status} ${response.statusText}${extra}`);
        }

        const data = await response.json() as { access_token?: string };
        if (!data.access_token) {
            throw new Error('DoseSpot token fetch failed: Missing access_token in response.');
        }

        return data.access_token;
    };

    if (!clinicianIdForRestAuth) {
        return fetchToken();
    }

    return fetchToken(clinicianIdForRestAuth.toString());
}
