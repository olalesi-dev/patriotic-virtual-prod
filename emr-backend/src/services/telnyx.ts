import { createHash, timingSafeEqual } from 'crypto';
import Telnyx from 'telnyx';
import { firestore } from '../config/firebase';
import { logger } from '../utils/logger';

const apiKey = process.env.TELNYX_API_KEY?.trim() || process.env.TELNYX_SECRET_KEY?.trim();
const configuredFromNumber = process.env.TELNYX_FROM_NUMBER?.trim();
const configuredMessagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID?.trim();
const fallbackFromNumbers = ['+13056862017', '+13056863679'];
const verifyWebhookUrl = process.env.TELNYX_VERIFY_WEBHOOK_URL?.trim() || 'https://api.patriotictelehealth.com/telnyx/webhook';
const verifyWhitelistedDestinations = (process.env.TELNYX_VERIFY_WHITELISTED_DESTINATIONS ?? 'US,CA,NP')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
const verifyProfileDoc = firestore.collection('__system').doc('telnyx_verify_profile');
const smsRateLimitCollection = firestore.collection('telnyx_sms_rate_limits');

const client = apiKey ? new Telnyx({ apiKey }) : null;
let cachedVerifyProfileId = process.env.TELNYX_VERIFY_PROFILE_ID?.trim()
    || process.env.TELNYX_PROFILE_VERIFY_ID?.trim()
    || process.env.TELNYX_PROFILE_ID?.trim()
    || null;

function getFromNumber(): string {
    return configuredFromNumber || fallbackFromNumbers[0];
}

function normalizePhoneNumber(value: string): string {
    const trimmed = value.trim();
    if (trimmed.startsWith('+')) {
        return `+${trimmed.slice(1).replace(/\D/g, '')}`;
    }

    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
    throw new Error('Phone number must include a valid country code or be a valid 10-digit US number.');
}

function samePhoneNumber(first: string, second: string): boolean {
    const normalizeDigits = (value: string) => value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    return normalizeDigits(first) === normalizeDigits(second);
}

function generateVerificationCode(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

function hashVerificationCode(phoneNumber: string, code: string): string {
    return createHash('sha256').update(`${phoneNumber}:${code}`).digest('hex');
}

function codesMatch(phoneNumber: string, code: string, expectedHash: string): boolean {
    const candidate = Buffer.from(hashVerificationCode(phoneNumber, code), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function readCachedLookup(value: unknown): {
    phone: string;
    valid: boolean;
    countryCode: string | null;
    lineType: string | null;
} | null {
    const lookup = asRecord(value);
    const phone = typeof lookup.phone === 'string' ? lookup.phone.trim() : '';
    if (!phone || lookup.valid !== true) return null;

    return {
        phone,
        valid: true,
        countryCode: typeof lookup.countryCode === 'string' ? lookup.countryCode : null,
        lineType: typeof lookup.lineType === 'string' ? lookup.lineType : null,
    };
}

async function telnyxFetch(path: string, init: RequestInit): Promise<any> {
    if (!apiKey) {
        throw new Error('TELNYX_API_KEY or TELNYX_SECRET_KEY is not configured.');
    }

    const response = await fetch(`https://api.telnyx.com${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
            ...(init.headers ?? {})
        }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const errorMessage = Array.isArray(payload?.errors)
            ? payload.errors.map((entry: any) => entry?.detail || entry?.title || 'Telnyx error').join('; ')
            : `Telnyx request failed with status ${response.status}.`;
        throw new Error(errorMessage);
    }

    return payload;
}

function isProfileNotFoundError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('profile not found') || message.includes('profile does not exist');
}

function isMessagingProfileSenderError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('alpha sender not configured') || message.includes('associated alphanumeric sender id');
}

async function lookupPhoneNumber(phoneNumber: string): Promise<{ valid: boolean; countryCode: string | null; lineType: string | null }> {
    const payload = await telnyxFetch(`/v2/number_lookup/${encodeURIComponent(phoneNumber)}?type=carrier&type=caller-name`, {
        method: 'GET'
    });

    return {
        valid: payload?.data?.valid_number === true,
        countryCode: typeof payload?.data?.country_code === 'string' ? payload.data.country_code : null,
        lineType: typeof payload?.data?.carrier?.type === 'string' ? payload.data.carrier.type : null
    };
}

async function enforceSmsRateLimit(recipientId: string): Promise<void> {
    const docRef = smsRateLimitCollection.doc(recipientId);
    const snapshot = await docRef.get();
    const lastSentAt = snapshot.exists
        ? snapshot.data()?.lastSentAt?.toDate?.() ?? (snapshot.data()?.lastSentAt instanceof Date ? snapshot.data()?.lastSentAt : null)
        : null;

    if (lastSentAt && Date.now() - lastSentAt.getTime() < 60_000) {
        throw new Error('Only one SMS per user is allowed per minute.');
    }

    await docRef.set({
        lastSentAt: new Date(),
        updatedAt: new Date()
    }, { merge: true });
}

async function getOrCreateVerifyProfileId(): Promise<string> {
    if (cachedVerifyProfileId) {
        try {
            await telnyxFetch(`/v2/verify_profiles/${encodeURIComponent(cachedVerifyProfileId)}`, {
                method: 'GET'
            });
            return cachedVerifyProfileId;
        } catch (error) {
            if (!isProfileNotFoundError(error)) {
                throw error;
            }
            cachedVerifyProfileId = null;
        }
    }

    const stored = await verifyProfileDoc.get();
    const storedProfileId = stored.exists ? String(stored.data()?.verifyProfileId ?? '').trim() : '';
    if (storedProfileId) {
        try {
            await telnyxFetch(`/v2/verify_profiles/${encodeURIComponent(storedProfileId)}`, {
                method: 'GET'
            });
            cachedVerifyProfileId = storedProfileId;
            return storedProfileId;
        } catch (error) {
            if (!isProfileNotFoundError(error)) {
                throw error;
            }
            await verifyProfileDoc.set({
                verifyProfileId: null,
                updatedAt: new Date()
            }, { merge: true });
        }
    }

    const payload = await telnyxFetch('/v2/verify_profiles', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Patriotic Telehealth Phone Verification',
            language: 'en-US',
            webhook_url: verifyWebhookUrl,
            sms: {
                whitelisted_destinations: verifyWhitelistedDestinations,
                default_timeout_secs: 300,
                code_length: 5
            }
        })
    });

    const verifyProfileId = String(payload?.data?.id ?? '').trim();
    if (!verifyProfileId) {
        throw new Error('Telnyx Verify profile creation did not return an id.');
    }

    cachedVerifyProfileId = verifyProfileId;
    await verifyProfileDoc.set({
        verifyProfileId,
        webhookUrl: verifyWebhookUrl,
        whitelistedDestinations: verifyWhitelistedDestinations,
        updatedAt: new Date()
    }, { merge: true });

    return verifyProfileId;
}

async function mergePhoneVerification(
    uid: string,
    patch: Record<string, unknown>,
    options: { includePatientRecord?: boolean } = {}
): Promise<void> {
    const writes: Array<Promise<FirebaseFirestore.WriteResult>> = [
        firestore.collection('users').doc(uid).set(patch, { merge: true })
    ];

    if (options.includePatientRecord) {
        writes.push(firestore.collection('patients').doc(uid).set(patch, { merge: true }));
    }

    await Promise.all(writes);
}

async function loadPhoneVerificationState(
    uid: string,
    options: { includePatientRecord?: boolean } = {}
): Promise<{
    phoneVerification: Record<string, unknown>;
    lookup: { phone: string; valid: boolean; countryCode: string | null; lineType: string | null } | null;
}> {
    const userDocPromise = firestore.collection('users').doc(uid).get();
    const patientDocPromise = options.includePatientRecord
        ? firestore.collection('patients').doc(uid).get()
        : Promise.resolve(null);
    const [userDoc, patientDoc] = await Promise.all([userDocPromise, patientDocPromise]);

    const userVerification = asRecord(userDoc.data()?.phoneVerification);
    const patientVerification = asRecord(patientDoc?.data()?.phoneVerification);
    const mergedVerification = Object.keys(userVerification).length > 0 ? userVerification : patientVerification;

    return {
        phoneVerification: mergedVerification,
        lookup: readCachedLookup(mergedVerification.lookup),
    };
}

export async function sendTelnyxSms(input: {
    recipientId: string;
    to: string;
    text: string;
}): Promise<{ providerMessageId: string | null; response: Record<string, unknown> | null }> {
    if (!client) {
        logger.warn('Telnyx credentials missing. Logging SMS instead.', {
            recipientId: input.recipientId,
            to: input.to,
            text: input.text
        });
        return { providerMessageId: null, response: null };
    }

    await enforceSmsRateLimit(input.recipientId);
    const to = normalizePhoneNumber(input.to);

    try {
        const payload: {
            from: string;
            to: string;
            text: string;
            messaging_profile_id?: string;
        } = {
            from: getFromNumber(),
            to,
            text: input.text
        };

        if (configuredMessagingProfileId) {
            payload.messaging_profile_id = configuredMessagingProfileId;
        }

        let response;
        try {
            response = await client.messages.send(payload);
        } catch (error) {
            if (!configuredMessagingProfileId || !isMessagingProfileSenderError(error)) {
                throw error;
            }

            logger.warn('Retrying Telnyx SMS without messaging profile id due to sender/profile configuration error', {
                recipientId: input.recipientId,
                to,
                messagingProfileId: configuredMessagingProfileId,
                error: error instanceof Error ? error.message : String(error),
            });

            response = await client.messages.send({
                from: getFromNumber(),
                to,
                text: input.text
            });
        }

        logger.info('Telnyx SMS API response', {
            recipientId: input.recipientId,
            response: response?.data ?? null,
        });

        return {
            providerMessageId: typeof response?.data?.id === 'string' ? response.data.id : null,
            response: typeof response?.data === 'object' && response.data !== null ? response.data as Record<string, unknown> : null,
        };
    } catch (error: any) {
        const status = Number(error?.status ?? 0);
        if (status === 429) {
            const retryAfter = Number(error?.headers?.['retry-after'] ?? 1);
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        }

        const message = error instanceof Error ? error.message : 'Failed to send Telnyx SMS.';
        logger.error('Failed to send SMS via Telnyx', { status, message, to });
        if (status === 403) {
            throw new Error(`${message} Check that the sending number is assigned to your Telnyx messaging profile.`);
        }
        throw new Error(message);
    }
}

export async function startTelnyxPhoneVerification(
    uid: string,
    phoneNumber: string,
    options: { includePatientRecord?: boolean } = {}
) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    logger.info('Phone verification request started', {
        uid,
        normalizedPhone,
    });

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 300_000);

    logger.info('Phone verification flow using direct SMS OTP', {
        uid,
        normalizedPhone,
        expiresAt: expiresAt.toISOString(),
    });

    const sendStartedAt = Date.now();
    const smsResult = await sendTelnyxSms({
        recipientId: uid,
        to: normalizedPhone,
        text: `Your Patriotic Telehealth verification code is ${verificationCode}. This code expires in 5 minutes.`
    });

    logger.info('Direct SMS verification code sent', {
        uid,
        normalizedPhone,
        providerMessageId: smsResult.providerMessageId,
        telnyxResponse: smsResult.response,
        sendDurationMs: Date.now() - sendStartedAt,
    });

    const persistStartedAt = Date.now();
    await mergePhoneVerification(uid, {
        phone: normalizedPhone,
        phoneNumber: normalizedPhone,
        phoneVerified: false,
        phoneVerification: {
            status: 'pending',
            phone: normalizedPhone,
            codeHash: hashVerificationCode(normalizedPhone, verificationCode),
            verificationId: smsResult.providerMessageId,
            provider: 'telnyx_sms',
            requestedAt: new Date(),
            expiresAt,
            failedAttempts: 0,
        },
        updatedAt: new Date()
    }, options);

    logger.info('Phone verification state persisted', {
        uid,
        normalizedPhone,
        persistDurationMs: Date.now() - persistStartedAt,
        includePatientRecord: options.includePatientRecord === true,
    });

    return {
        phone_number: normalizedPhone,
        id: smsResult.providerMessageId,
        type: 'sms',
        status: 'pending',
        timeout_secs: 300,
        record_type: 'verification',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        delivery_status: null,
        telnyx_message: smsResult.response,
    };
}

export async function verifyTelnyxPhoneCode(
    uid: string,
    phoneNumber: string,
    code: string,
    options: { includePatientRecord?: boolean } = {}
) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    logger.info('Verifying backend-managed phone verification code', {
        uid,
        normalizedPhone,
    });

    const existingState = await loadPhoneVerificationState(uid, options);
    const verification = existingState.phoneVerification;
    const verificationPhone = typeof verification.phone === 'string' ? verification.phone.trim() : '';
    const codeHash = typeof verification.codeHash === 'string' ? verification.codeHash.trim() : '';
    const failedAttempts = typeof verification.failedAttempts === 'number' ? verification.failedAttempts : 0;
    const expiresAtValue = verification.expiresAt;
    const expiresAt = expiresAtValue instanceof Date
        ? expiresAtValue
        : typeof (expiresAtValue as { toDate?: () => Date } | undefined)?.toDate === 'function'
            ? (expiresAtValue as { toDate: () => Date }).toDate()
            : typeof expiresAtValue === 'string'
                ? new Date(expiresAtValue)
                : null;

    if (!verificationPhone || !samePhoneNumber(verificationPhone, normalizedPhone)) {
        throw new Error('No pending verification was found for this phone number.');
    }
    if (!codeHash) {
        throw new Error('No pending verification code was found. Please request a new code.');
    }
    if (expiresAt && expiresAt.getTime() < Date.now()) {
        throw new Error('Verification code has expired. Please request a new code.');
    }
    if (failedAttempts >= 5) {
        throw new Error('Maximum verification attempts exceeded. Please request a new code.');
    }
    if (!codesMatch(normalizedPhone, code, codeHash)) {
        await mergePhoneVerification(uid, {
            phoneVerification: {
                ...verification,
                failedAttempts: failedAttempts + 1,
                updatedAt: new Date(),
            },
            updatedAt: new Date(),
        }, options);
        throw new Error('Verification code was not accepted.');
    }

    logger.info('Backend-managed verification code accepted', {
        uid,
        normalizedPhone,
    });

    await mergePhoneVerification(uid, {
        phone: normalizedPhone,
        phoneNumber: normalizedPhone,
        phoneVerified: true,
        phoneVerification: {
            ...verification,
            status: 'verified',
            phone: normalizedPhone,
            verifiedAt: new Date(),
            lastResponseCode: 'accepted',
            codeHash: null,
        },
        updatedAt: new Date()
    }, options);

    return {
        phone_number: normalizedPhone,
        response_code: 'accepted'
    };
}

export function isPhoneVerified(data: Record<string, unknown>, phone: string | null): boolean {
    if (!phone) return false;
    const verification = typeof data.phoneVerification === 'object' && data.phoneVerification !== null
        ? data.phoneVerification as Record<string, unknown>
        : {};
    const verifiedPhone = typeof verification.phone === 'string' ? verification.phone.trim() : null;
    return data.phoneVerified === true && verifiedPhone !== null && samePhoneNumber(verifiedPhone, phone);
}
