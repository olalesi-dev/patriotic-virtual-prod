import crypto from 'crypto';

// FIRESTORE DEPENDENCY:
// Reads doseSpotClinicianId (integer) from /users/{uid}
// Set this field when creating a provider via POST /api/v1/admin/users
// or manually: db.collection('users').doc(uid).set({ doseSpotClinicianId: 3088396 }, { merge: true })
// The staging test clinician ID is: 3088396

function generatePhrase(): string {
    // Generate a cryptographically random 32-character alphanumeric string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(32);
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

function generateEncryptedClinicId(clinicKey: string, phrase: string): string {
    // 1. Concatenate: phrase + clinicKey
    const concatenated = phrase + clinicKey;
    // 2. Get UTF8 bytes
    // 3. SHA512 hash those bytes
    const hash = crypto.createHash('sha512').update(Buffer.from(concatenated, 'utf8')).digest();
    // 4. Base64 encode the hash -> hashB64
    let hashB64 = hash.toString('base64');
    // 5. If hashB64 ends with '==', remove those two '==' characters
    if (hashB64.endsWith('==')) {
        hashB64 = hashB64.slice(0, -2);
    }
    // 6. Prepend the phrase: phrase + hashB64
    const finalString = phrase + hashB64;
    // 7. URL encode the ENTIRE result -> return
    return encodeURIComponent(finalString);
}

function generateEncryptedUserId(userId: string, clinicKey: string, phrase: string): string {
    // 1. Take the FIRST 22 characters of phrase -> phrase22
    const phrase22 = phrase.slice(0, 22);
    // 2. Concatenate: userId + phrase22 + clinicKey
    const concatenated = userId + phrase22 + clinicKey;
    // 3. Get UTF8 bytes
    // 4. SHA512 hash those bytes
    const hash = crypto.createHash('sha512').update(Buffer.from(concatenated, 'utf8')).digest();
    // 5. Base64 encode the hash -> hashB64
    let hashB64 = hash.toString('base64');
    // 6. If hashB64 ends with '==', remove those two '==' characters
    if (hashB64.endsWith('==')) {
        hashB64 = hashB64.slice(0, -2);
    }
    // 7. URL encode the ENTIRE result -> return
    return encodeURIComponent(hashB64);
}

export function generateSSOUrl(params: {
    clinicianDoseSpotId: number;
    patientDoseSpotId?: number;
    refillsErrors?: boolean;
}): string {
    const clinicId = process.env.DOSESPOT_CLINIC_ID!;
    const clinicKey = process.env.DOSESPOT_CLINIC_KEY!;
    const baseUrl = process.env.DOSESPOT_BASE_URL!;

    const phrase = generatePhrase();

    // Notice we URL encode natively in the helper functions, 
    // so we won't URL encode again in URLSearchParams if we use raw string formatting. Or we can just build the string.
    // Wait, if generateEncryptedClinicId returns a URL Encoded string, then URLSearchParams will DOUBLE ENCODE it.
    // We need to NOT double-encode.

    // The instructions explicitly say: "URL encoding: use `encodeURIComponent` for Step 7 in both encrypt functions,
    // OR rely on URLSearchParams which handles encoding automatically in Step D — do NOT double-encode".
    // Let's decode it before throwing into URLSearchParams, or just use string concat. Wait, URLSearchParams is safe if we don't URL encode in the function.
    // Let me adjust the internal functions to NOT url encode, and let URLSearchParams do it.

    // Actually, I'll adjust the internal ones to NOT encode, so URLSearchParams works perfectly.
    const ssoCode = decodeURIComponent(generateEncryptedClinicId(clinicKey, phrase));
    const ssoUserVerify = decodeURIComponent(generateEncryptedUserId(
        params.clinicianDoseSpotId.toString(),
        clinicKey,
        phrase
    ));

    const urlParams = new URLSearchParams({
        SingleSignOnClinicId: clinicId,
        SingleSignOnUserId: params.clinicianDoseSpotId.toString(),
        SingleSignOnPhraseLength: '32',
        SingleSignOnCode: ssoCode,
        SingleSignOnUserIdVerify: ssoUserVerify,
    });

    if (params.patientDoseSpotId) {
        urlParams.set('PatientId', params.patientDoseSpotId.toString());
    }

    if (params.refillsErrors) {
        urlParams.set('RefillsErrors', '1');
        urlParams.delete('PatientId'); // mutually exclusive per DoseSpot spec
    }

    return `${baseUrl}/LoginSingleSignOn.aspx?${urlParams.toString()}`;
}

// In-memory token cache (per server instance)
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

export async function getDoseSpotAccessToken(onBehalfOfClinicianId?: number): Promise<string> {
    // Return cached token if still valid (with 60s safety buffer)
    if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
        return tokenCache.accessToken;
    }

    const params = new URLSearchParams({
        grant_type: 'password',
        client_id: process.env.DOSESPOT_CLINIC_ID!,
        client_secret: process.env.DOSESPOT_CLINIC_KEY!,
        username: process.env.DOSESPOT_USER_ID!,
        password: process.env.DOSESPOT_CLINIC_KEY!,
        scope: 'api',
    });

    if (onBehalfOfClinicianId) {
        params.set('acr_values', `OnBehalfOfUserId=${onBehalfOfClinicianId}`);
    }

    const response = await fetch(`${process.env.DOSESPOT_BASE_URL}/webapi/v2/connect/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(process.env.DOSESPOT_SUBSCRIPTION_KEY ? { 'Subscription-Key': process.env.DOSESPOT_SUBSCRIPTION_KEY } : {})
        },
        body: params.toString()
    });

    if (!response.ok) {
        throw new Error(`DoseSpot token fetch failed: ${response.statusText}`);
    }

    const data = await response.json();

    tokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };

    return data.access_token;
}
