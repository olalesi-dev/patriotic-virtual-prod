import crypto from 'crypto';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

export type IdentityVerificationStatus = 'not_started' | 'pending' | 'verified' | 'failed' | 'review_required';

export interface VouchedPersistenceResult {
    uid: string;
    verified: boolean;
    status: IdentityVerificationStatus;
    jobId: string | null;
    internalId: string | null;
    failureReason: string | null;
    warningCode: string | null;
    warningMessage: string | null;
}

type FirestoreTimestampValue = ReturnType<typeof admin.firestore.FieldValue.serverTimestamp> | null;

interface VouchedPatchPayload {
    identityVerification: {
        provider: 'vouched';
        status: IdentityVerificationStatus;
        verified: boolean;
        jobId: string | null;
        internalId: string | null;
        verifiedAt: FirestoreTimestampValue;
        lastUpdatedAt: ReturnType<typeof admin.firestore.FieldValue.serverTimestamp>;
        failureReason: string | null;
        warningCode: string | null;
        warningMessage: string | null;
    };
    isIdentityVerified: boolean;
    vouchedJobId: string | null;
    vouchedStatus: string | null;
    vouchedVerificationDate: FirestoreTimestampValue;
    updatedAt: ReturnType<typeof admin.firestore.FieldValue.serverTimestamp>;
}

function asString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function asBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function getVouchedPrivateKey(): string {
    const privateKey = process.env.VOUCHED_PRIVATE_KEY?.trim();
    if (!privateKey) {
        throw new Error('VOUCHED_PRIVATE_KEY is not configured.');
    }
    return privateKey;
}

function getVouchedSignatureKey(): string {
    const signatureKey = process.env.VOUCHED_SIGNATURE_KEY?.trim();
    return signatureKey || getVouchedPrivateKey();
}

function compareSignatures(left: string, right: string): boolean {
    try {
        return crypto.timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
    } catch {
        return false;
    }
}

function createSignature(rawBody: string): string {
    return crypto
        .createHmac('sha1', getVouchedSignatureKey())
        .update(rawBody, 'utf8')
        .digest('base64');
}

function extractPropertyMap(job: Record<string, unknown>): Record<string, string> {
    const request = asRecord(job.request) ?? {};
    const properties = asArray(request.properties);
    const output: Record<string, string> = {};

    for (const entry of properties) {
        const record = asRecord(entry);
        if (!record) continue;
        const name = asString(record.name);
        const value = asString(record.value);
        if (name && value) {
            output[name] = value;
        }
    }

    return output;
}

function extractInternalId(job: Record<string, unknown>): string | null {
    const request = asRecord(job.request) ?? {};
    const parameters = asRecord(request.parameters) ?? {};
    const directInternalId = asString(parameters.internalId);
    if (directInternalId) return directInternalId;

    const properties = extractPropertyMap(job);
    return properties.internalId ?? null;
}

function extractUidFromInternalId(internalId: string | null): string | null {
    if (!internalId) return null;

    const parts = internalId.split(':');
    if (parts.length >= 2 && parts[0] === 'patient' && parts[1]) {
        return parts[1];
    }

    return null;
}

function extractUidFromJob(job: Record<string, unknown>): string | null {
    const properties = extractPropertyMap(job);
    const propertyUid = properties.firebaseUid ?? properties.uid ?? properties.userUid ?? properties.patientUid;
    if (propertyUid) return propertyUid;

    return extractUidFromInternalId(extractInternalId(job));
}

function extractWarningCode(job: Record<string, unknown>): string | null {
    const result = asRecord(job.result) ?? {};
    const resultError = result.error;

    if (typeof resultError === 'string') {
        return resultError;
    }

    const errorRecord = asRecord(resultError);
    if (errorRecord) {
        return asString(errorRecord.type) ?? asString(errorRecord.code) ?? null;
    }

    const errors = asArray(job.errors);
    for (const entry of errors) {
        const record = asRecord(entry);
        if (!record) continue;
        const type = asString(record.type) ?? asString(record.code);
        if (type) return type;
    }

    return null;
}

function extractWarningMessage(job: Record<string, unknown>): string | null {
    const result = asRecord(job.result) ?? {};
    const resultError = result.error;

    if (typeof resultError === 'string') {
        return resultError;
    }

    const errorRecord = asRecord(resultError);
    if (errorRecord) {
        return asString(errorRecord.message) ?? asString(errorRecord.type) ?? null;
    }

    const errors = asArray(job.errors);
    for (const entry of errors) {
        const record = asRecord(entry);
        if (!record) continue;
        const message = asString(record.message) ?? asString(record.type);
        if (message) return message;
    }

    return null;
}

function deriveVerificationStatus(job: Record<string, unknown>): IdentityVerificationStatus {
    const result = asRecord(job.result) ?? {};
    const isSuccessful = asBoolean(result.success) ?? false;
    const hasWarnings = asBoolean(result.warnings) ?? false;
    const status = asString(job.status)?.toLowerCase();

    if (isSuccessful && !hasWarnings) return 'verified';
    if (isSuccessful && hasWarnings) return 'review_required';
    if (status === 'active') return 'pending';
    return 'failed';
}

function buildVerificationPatch(job: Record<string, unknown>): {
    patch: VouchedPatchPayload;
    response: Omit<VouchedPersistenceResult, 'uid'>;
} {
    const jobId = asString(job.id);
    const internalId = extractInternalId(job);
    const status = deriveVerificationStatus(job);
    const verified = status === 'verified';
    const warningCode = extractWarningCode(job);
    const warningMessage = extractWarningMessage(job);
    const failureReason = verified
        ? null
        : warningMessage ?? 'Identity verification did not complete successfully.';
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const verifiedAt = verified ? admin.firestore.FieldValue.serverTimestamp() : null;
    const jobStatus = asString(job.status);

    return {
        patch: {
            identityVerification: {
                provider: 'vouched',
                status,
                verified,
                jobId,
                internalId,
                verifiedAt,
                lastUpdatedAt: timestamp,
                failureReason,
                warningCode,
                warningMessage,
            },
            isIdentityVerified: verified,
            vouchedJobId: jobId,
            vouchedStatus: jobStatus,
            vouchedVerificationDate: verifiedAt,
            updatedAt: timestamp,
        },
        response: {
            verified,
            status,
            jobId,
            internalId,
            failureReason,
            warningCode,
            warningMessage,
        },
    };
}

async function addAuditEntry(uid: string, result: VouchedPersistenceResult): Promise<void> {
    await admin.firestore().collection('audit_logs').add({
        userId: uid,
        action: 'IDENTITY_VERIFICATION_UPDATED',
        provider: 'vouched',
        status: result.status,
        verified: result.verified,
        jobId: result.jobId,
        warningCode: result.warningCode,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function shouldMirrorPatientRecord(uid: string): Promise<boolean> {
    const firestore = admin.firestore();
    const [userDoc, patientDoc] = await Promise.all([
        firestore.collection('users').doc(uid).get(),
        firestore.collection('patients').doc(uid).get(),
    ]);

    const role = asString(userDoc.data()?.role)?.toLowerCase();
    return patientDoc.exists || role === 'patient';
}

export function verifyVouchedWebhookSignature(rawBody: string, signatureHeader: string | null | undefined): boolean {
    if (!rawBody || !signatureHeader) return false;
    return compareSignatures(createSignature(rawBody), signatureHeader);
}

export async function fetchVouchedJob(jobId: string): Promise<Record<string, unknown>> {
    const response = await fetch(`https://verify.vouched.id/api/jobs/${encodeURIComponent(jobId)}`, {
        headers: {
            'X-Api-Key': getVouchedPrivateKey(),
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Vouched job ${jobId}: ${response.status}`);
    }

    const payload = await response.json();
    const record = asRecord(payload);
    if (!record) {
        throw new Error('Vouched job response was not an object.');
    }

    return record;
}

export async function findUidForVouchedJob(job: Record<string, unknown>): Promise<string | null> {
    const directUid = extractUidFromJob(job);
    if (directUid) return directUid;

    const jobId = asString(job.id);
    if (!jobId) return null;

    const firestore = admin.firestore();
    const usersSnapshot = await firestore
        .collection('users')
        .where('identityVerification.jobId', '==', jobId)
        .limit(1)
        .get();

    if (!usersSnapshot.empty) {
        return usersSnapshot.docs[0].id;
    }

    const patientsSnapshot = await firestore
        .collection('patients')
        .where('vouchedJobId', '==', jobId)
        .limit(1)
        .get();

    if (!patientsSnapshot.empty) {
        return patientsSnapshot.docs[0].id;
    }

    return null;
}

export async function persistVouchedJobResult(uid: string, job: Record<string, unknown>): Promise<VouchedPersistenceResult> {
    const firestore = admin.firestore();
    const userRef = firestore.collection('users').doc(uid);
    const patientRef = firestore.collection('patients').doc(uid);
    const { patch, response } = buildVerificationPatch(job);
    const writes: Array<Promise<unknown>> = [userRef.set(patch, { merge: true })];

    if (await shouldMirrorPatientRecord(uid)) {
        writes.push(patientRef.set(patch, { merge: true }));
    }

    await Promise.all(writes);

    const result: VouchedPersistenceResult = {
        uid,
        ...response,
    };

    await addAuditEntry(uid, result);

    logger.info('[Vouched] Persisted verification result', {
        uid,
        status: result.status,
        verified: result.verified,
        jobId: result.jobId,
    });

    return result;
}