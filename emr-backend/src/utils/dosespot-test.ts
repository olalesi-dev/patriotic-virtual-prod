/**
 * DoseSpot SSO URL Test Script
 * 
 * Tests SSO link generation using the credentials from the Integration Guide:
 *   Clinic ID:   1007159
 *   Clinic Key:  HPHH63FJA79VHFQQ5S4UR2K9JMVTF2N9
 *   Clinician ID: 3088396
 *   Base URL:    https://my.staging.dosespot.com
 * 
 * Usage:
 *   npx ts-node src/utils/dosespot-test.ts
 *   node -e "require('./dist/utils/dosespot-test.js')"
 * 
 * Or simply run: npx ts-node -e "require('./src/utils/dosespot-test.ts')"
 */

import crypto from 'crypto';

// ── Credentials (from the DoseSpot Integration Guide) ──────────────────────
const CLINIC_ID    = '1007159';
const CLINIC_KEY   = 'HPHH63FJA79VHFQQ5S4UR2K9JMVTF2N9';
const CLINICIAN_ID = '3088396';
const BASE_URL     = 'https://my.staging.dosespot.com';

// ── Step 1: Generate a 32-character random alphanumeric phrase ──────────────
function generatePhrase(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes  = crypto.randomBytes(32);
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

/**
 * Encrypted Clinic ID  (SingleSignOnCode)
 * ─────────────────────────────────────────
 * Step A:  Concatenate: phrase + clinicKey
 * Step B:  SHA512 hash the UTF-8 bytes
 * Step C:  Base64-encode the hash → hashB64
 * Step D:  Strip all trailing '=' from hashB64
 * Step E:  Prepend phrase → phrase + hashB64
 * Step F:  URL-encode the entire string
 */
function encryptClinicId(clinicKey: string, phrase: string): string {
    const raw    = phrase + clinicKey;
    const hash   = crypto.createHash('sha512').update(Buffer.from(raw, 'utf8')).digest();
    let   hashB64 = hash.toString('base64').replace(/=+$/, '');
    const result  = phrase + hashB64;
    return encodeURIComponent(result);
}

/**
 * Encrypted User ID  (SingleSignOnUserIdVerify)
 * ──────────────────────────────────────────────
 * Step A:  Use first 22 chars of phrase → phrase22
 * Step B:  Concatenate: userId + phrase22 + clinicKey
 * Step C:  SHA512 hash the UTF-8 bytes
 * Step D:  Base64-encode → hashB64
 * Step E:  Strip all trailing '=' from hashB64
 * Step F:  URL-encode hashB64 only (no phrase prefix this time)
 */
function encryptUserId(userId: string, clinicKey: string, phrase: string): string {
    const phrase22 = phrase.slice(0, 22);
    const raw      = userId + phrase22 + clinicKey;
    const hash     = crypto.createHash('sha512').update(Buffer.from(raw, 'utf8')).digest();
    let   hashB64  = hash.toString('base64').replace(/=+$/, '');
    return encodeURIComponent(hashB64);
}

/**
 * Build the full SSO URL
 * ─────────────────────────────────────────────────────────────────────────
 * Parameter layout (from DoseSpot guide, p.6):
 *   SingleSignOnClinicId      = CLINIC_ID              (integer)
 *   SingleSignOnUserId        = CLINICIAN_ID           (integer)
 *   SingleSignOnPhraseLength  = 32                     (length of phrase)
 *   SingleSignOnCode          = encryptClinicId(...)   (URL-encoded)
 *   SingleSignOnUserIdVerify  = encryptUserId(...)     (URL-encoded)
 *
 * NOTE: Because encryptClinicId / encryptUserId already return URL-encoded
 * values we build the query string manually (NOT through URLSearchParams,
 * which would double-encode the values).
 */
function buildSSOUrl(params: {
    clinicianId?: string;
    patientDoseSpotId?: number;
    refillsErrors?: boolean;
}): string {

    const clinicianId = params.clinicianId ?? CLINICIAN_ID;
    const phrase      = generatePhrase();

    const ssoCode       = encryptClinicId(CLINIC_KEY, phrase);
    const ssoUserVerify = encryptUserId(clinicianId, CLINIC_KEY, phrase);

    // Build query string manually to avoid double-encoding
    const parts: string[] = [
        `SingleSignOnClinicId=${CLINIC_ID}`,
        `SingleSignOnUserId=${clinicianId}`,
        `SingleSignOnPhraseLength=32`,
        `SingleSignOnCode=${ssoCode}`,
        `SingleSignOnUserIdVerify=${ssoUserVerify}`,
    ];

    if (params.patientDoseSpotId) {
        parts.push(`PatientId=${params.patientDoseSpotId}`);
    }

    if (params.refillsErrors) {
        // Mutually exclusive with PatientId
        const patientIdx = parts.findIndex(p => p.startsWith('PatientId='));
        if (patientIdx !== -1) parts.splice(patientIdx, 1);
        parts.push('RefillsErrors=1');
    }

    return `${BASE_URL}/LoginSingleSignOn.aspx?${parts.join('&')}`;
}

// ── Run the test ────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  DoseSpot SSO URL Generator — Test Run');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Credentials:');
console.log(`  Clinic ID     : ${CLINIC_ID}`);
console.log(`  Clinic Key    : ${CLINIC_KEY}`);
console.log(`  Clinician ID  : ${CLINICIAN_ID}`);
console.log(`  Base URL      : ${BASE_URL}`);
console.log();

// Test 1: Provider-only SSO (no patient)
const url1 = buildSSOUrl({});
console.log('Test 1 — Provider SSO (no patient):');
console.log(url1);
console.log();

// Test 2: With a dummy patient DoseSpot ID
const url2 = buildSSOUrl({ patientDoseSpotId: 12345 });
console.log('Test 2 — With Patient ID 12345:');
console.log(url2);
console.log();

// Test 3: Refills & Errors mode
const url3 = buildSSOUrl({ refillsErrors: true });
console.log('Test 3 — Refills & Errors mode:');
console.log(url3);
console.log();

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  Open Test 1 URL in your browser to verify DoseSpot SSO ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

export { buildSSOUrl, encryptClinicId, encryptUserId, generatePhrase };
