import crypto from 'crypto';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

export type IdentityVerificationStatus = 'not_started' | 'pending' | 'verified' | 'failed' | 'review_required';
export type IdentityVerificationMethod = 'crosscheck' | 'dob' | 'visual_id';
export type VouchedWorkflowNextStep = 'none' | 'visual_id';

export interface VouchedWorkflowInput {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    dob?: string | null;
    address1?: string | null;
    unit?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    ipAddress?: string | null;
}

export interface VouchedWorkflowResult {
    uid: string;
    verified: boolean;
    status: IdentityVerificationStatus;
    method: IdentityVerificationMethod | null;
    nextStep: VouchedWorkflowNextStep;
    crosscheckScore: number | null;
    crosscheckThreshold: number;
    dobMatch: boolean | null;
    failureReason: string | null;
    warningMessage: string | null;
}

type VouchedApiTraceStep = 'crosscheck' | 'dob_verify';

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
        method?: IdentityVerificationMethod | null;
        requiredMethod?: IdentityVerificationMethod | null;
        workflow?: string;
        visualId?: Record<string, unknown>;
    };
    identityVerificationHistory?: unknown;
    isIdentityVerified: boolean;
    vouchedJobId: string | null;
    vouchedStatus: string | null;
    vouchedVerificationDate: FirestoreTimestampValue;
    updatedAt: ReturnType<typeof admin.firestore.FieldValue.serverTimestamp>;
}

const WORKFLOW_VERSION = 'crosscheck_dob_visual_id_v1';
const DEFAULT_CROSSCHECK_THRESHOLD = 0.85;

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

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function getVouchedPrivateKey(): string {
    const privateKey = process.env.VOUCHED_PRIVATE_KEY?.trim();
    if (!privateKey) {
        throw new Error('VOUCHED_PRIVATE_KEY is not configured.');
    }
    return privateKey;
}

function maskSecret(value: string): string {
    const normalized = value.trim();
    if (normalized.length <= 8) return `len:${normalized.length}`;
    return `${normalized.slice(0, 4)}...${normalized.slice(-4)} (len:${normalized.length})`;
}

function getVouchedSignatureKey(): string {
    const signatureKey = process.env.VOUCHED_SIGNATURE_KEY?.trim();
    return signatureKey || getVouchedPrivateKey();
}

function getCrossCheckThreshold(): number {
    const configured = Number(process.env.VOUCHED_CROSSCHECK_THRESHOLD ?? '');
    if (Number.isFinite(configured) && configured > 0 && configured <= 1) {
        return configured;
    }
    return DEFAULT_CROSSCHECK_THRESHOLD;
}

function toTimestamp(): admin.firestore.Timestamp {
    return admin.firestore.Timestamp.now();
}

function normalizePhoneForVouched(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (trimmed.startsWith('+')) return trimmed;

    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return trimmed;
}

function sanitizeWorkflowInput(input: VouchedWorkflowInput): Required<VouchedWorkflowInput> {
    return {
        firstName: asString(input.firstName) ?? '',
        lastName: asString(input.lastName) ?? '',
        email: asString(input.email) ?? '',
        phone: normalizePhoneForVouched(asString(input.phone)) ?? '',
        dob: asString(input.dob) ?? '',
        address1: asString(input.address1) ?? '',
        unit: asString(input.unit) ?? '',
        city: asString(input.city) ?? '',
        state: asString(input.state) ?? '',
        postalCode: asString(input.postalCode) ?? '',
        country: asString(input.country) ?? '',
        ipAddress: asString(input.ipAddress) ?? '',
    };
}

function pickFirstNumber(...values: unknown[]): number | null {
    for (const value of values) {
        const parsed = asNumber(value);
        if (parsed !== null) return parsed;
    }
    return null;
}

function extractCrossCheckScore(payload: Record<string, unknown>): number | null {
    const result = asRecord(payload.result) ?? payload;
    const crosscheck = asRecord(result.crosscheck) ?? asRecord(payload.crosscheck) ?? {};
    const crosscheckConfidences = asRecord(crosscheck.confidences) ?? {};
    const resultConfidences = asRecord(result.confidences) ?? {};

    return pickFirstNumber(
        crosscheckConfidences.identity,
        resultConfidences.identity,
        crosscheck.identity,
        result.identity,
        payload.identityScore,
        payload.score
    );
}

function extractDobMatch(payload: Record<string, unknown>): boolean | null {
    const result = asRecord(payload.result) ?? payload;
    const direct = asBoolean(result.dobMatch) ?? asBoolean(payload.dobMatch);
    if (direct !== null) return direct;

    const dob = asRecord(result.dob) ?? asRecord(payload.dob);
    return asBoolean(dob?.match) ?? asBoolean(dob?.dobMatch);
}

function buildAddress(input: Required<VouchedWorkflowInput>): Record<string, string> | undefined {
    const address: Record<string, string> = {};
    if (input.unit) address.unit = input.unit;
    if (input.address1) address.streetAddress = input.address1;
    if (input.city) address.city = input.city;
    if (input.state) address.state = input.state;
    if (input.postalCode) address.postalCode = input.postalCode;
    const country = asString(input.country)?.toUpperCase();
    address.country = country === 'CA' ? 'CA' : 'US';

    const hasPrimaryAddress = Boolean(address.streetAddress || address.city || address.state || address.postalCode);
    return hasPrimaryAddress ? address : undefined;
}

function buildVouchedHeaders(): Record<string, string> {
    const privateKey = getVouchedPrivateKey();
    const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': privateKey,
    };

    logger.info('[Vouched] Prepared API headers', {
        apiKeySource: 'VOUCHED_PRIVATE_KEY',
        apiKeyPreview: maskSecret(privateKey),
        headerNames: Object.keys(headers),
    });

    return headers;
}

async function postVouchedJson(endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    logger.info('[Vouched] Sending API request', {
        endpoint,
        method: 'POST',
    });

    const response = await fetch(`https://verify.vouched.id${endpoint}`, {
        method: 'POST',
        headers: buildVouchedHeaders(),
        body: JSON.stringify(body),
    });

    let payload: unknown = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const record = asRecord(payload);
        logger.warn('[Vouched] API request failed', {
            endpoint,
            status: response.status,
            response: record ?? payload,
        });
        const message = asString(record?.message)
            ?? asString(record?.error)
            ?? `Vouched request failed with status ${response.status}.`;
        throw new Error(message);
    }

    const record = asRecord(payload);
    if (!record) {
        throw new Error('Vouched response was not an object.');
    }

    return record;
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
    const completedAt = toTimestamp();
    const historyEntry = {
        provider: 'vouched',
        workflow: WORKFLOW_VERSION,
        method: 'visual_id',
        requiredMethod: null,
        status,
        verified,
        jobId,
        internalId,
        failureReason,
        warningCode,
        warningMessage,
        completedAt,
    };

    return {
        patch: {
            identityVerification: {
                provider: 'vouched',
                workflow: WORKFLOW_VERSION,
                status,
                verified,
                jobId,
                internalId,
                verifiedAt,
                lastUpdatedAt: timestamp,
                failureReason,
                warningCode,
                warningMessage,
                method: 'visual_id',
                requiredMethod: null,
                visualId: {
                    jobId,
                    internalId,
                    status,
                    verified,
                    jobStatus,
                    warningCode,
                    warningMessage,
                    completedAt,
                },
            },
            identityVerificationHistory: admin.firestore.FieldValue.arrayUnion(historyEntry),
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

function mergeVerificationInput(
    source: Record<string, unknown>,
    override: VouchedWorkflowInput,
): Required<VouchedWorkflowInput> {
    const sourceAddress = asRecord(source.address) ?? {};

    return sanitizeWorkflowInput({
        firstName: override.firstName ?? asString(source.firstName),
        lastName: override.lastName ?? asString(source.lastName),
        email: override.email ?? asString(source.email),
        phone: override.phone ?? asString(source.phone) ?? asString(source.phoneNumber),
        dob: override.dob ?? asString(source.dateOfBirth) ?? asString(source.dob),
        address1: override.address1
            ?? asString(source.address1)
            ?? asString(sourceAddress.streetAddress)
            ?? asString(sourceAddress.address1)
            ?? asString(source.address),
        unit: override.unit ?? asString(sourceAddress.unit) ?? asString(source.unit),
        city: override.city ?? asString(source.city) ?? asString(sourceAddress.city),
        state: override.state ?? asString(source.state) ?? asString(sourceAddress.state),
        postalCode: override.postalCode
            ?? asString(source.zipCode)
            ?? asString(source.zip)
            ?? asString(source.postalCode)
            ?? asString(sourceAddress.postalCode)
            ?? asString(sourceAddress.zipCode)
            ?? asString(sourceAddress.zip),
        country: override.country ?? asString(source.country) ?? asString(sourceAddress.country),
        ipAddress: override.ipAddress,
    });
}

function getExistingWorkflowResult(uid: string, source: Record<string, unknown>, threshold: number): VouchedWorkflowResult | null {
    const verification = asRecord(source.identityVerification) ?? {};
    const verified = Boolean(verification.verified ?? source.isIdentityVerified ?? false);
    const statusValue = asString(verification.status);
    const status: IdentityVerificationStatus | null =
        statusValue === 'verified' || statusValue === 'review_required' || statusValue === 'pending' || statusValue === 'failed' || statusValue === 'not_started'
            ? statusValue
            : null;
    const crosscheck = asRecord(verification.crosscheck) ?? {};
    const dob = asRecord(verification.dob) ?? {};
    const methodValue = asString(verification.method);
    const method: IdentityVerificationMethod | null =
        methodValue === 'crosscheck' || methodValue === 'dob' || methodValue === 'visual_id'
            ? methodValue
            : verified
                ? 'visual_id'
                : null;
    const requiredMethodValue = asString(verification.requiredMethod);
    const requiredMethod: IdentityVerificationMethod | null =
        requiredMethodValue === 'crosscheck' || requiredMethodValue === 'dob' || requiredMethodValue === 'visual_id'
            ? requiredMethodValue
            : null;

    if (status === 'pending' && requiredMethod === 'visual_id') {
        return {
            uid,
            verified: false,
            status,
            method,
            nextStep: 'visual_id',
            crosscheckScore: asNumber(crosscheck.score),
            crosscheckThreshold: asNumber(crosscheck.threshold) ?? threshold,
            dobMatch: asBoolean(dob.dobMatch),
            failureReason: asString(verification.failureReason),
            warningMessage: asString(verification.warningMessage) ?? 'Visual identity verification is required.',
        };
    }

    if (status !== 'verified' && status !== 'review_required' && !verified) {
        return null;
    }

    return {
        uid,
        verified,
        status: status ?? (verified ? 'verified' : 'review_required'),
        method,
        nextStep: 'none',
        crosscheckScore: asNumber(crosscheck.score),
        crosscheckThreshold: asNumber(crosscheck.threshold) ?? threshold,
        dobMatch: asBoolean(dob.dobMatch),
        failureReason: asString(verification.failureReason),
        warningMessage: asString(verification.warningMessage),
    };
}

async function loadWorkflowSource(uid: string, override: VouchedWorkflowInput): Promise<{
    source: Record<string, unknown>;
    input: Required<VouchedWorkflowInput>;
}> {
    const firestore = admin.firestore();
    const [patientDoc, userDoc] = await Promise.all([
        firestore.collection('patients').doc(uid).get(),
        firestore.collection('users').doc(uid).get(),
    ]);
    const source = {
        ...(userDoc.exists ? userDoc.data() : {}),
        ...(patientDoc.exists ? patientDoc.data() : {}),
    } as Record<string, unknown>;

    return {
        source,
        input: mergeVerificationInput(source, override),
    };
}

async function updateIdentityVerification(uid: string, patch: Record<string, unknown>): Promise<void> {
    const firestore = admin.firestore();
    const userRef = firestore.collection('users').doc(uid);
    const patientRef = firestore.collection('patients').doc(uid);
    const writes: Array<Promise<unknown>> = [userRef.set(patch, { merge: true })];

    if (await shouldMirrorPatientRecord(uid)) {
        writes.push(patientRef.set(patch, { merge: true }));
    }

    await Promise.all(writes);
}

async function addWorkflowAuditEntry(uid: string, result: VouchedWorkflowResult): Promise<void> {
    await admin.firestore().collection('audit_logs').add({
        userId: uid,
        action: 'IDENTITY_VERIFICATION_WORKFLOW_UPDATED',
        provider: 'vouched',
        workflow: WORKFLOW_VERSION,
        status: result.status,
        verified: result.verified,
        method: result.method,
        nextStep: result.nextStep,
        crosscheckScore: result.crosscheckScore,
        crosscheckThreshold: result.crosscheckThreshold,
        dobMatch: result.dobMatch,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function addVouchedApiTraceEntry(params: {
    uid: string;
    step: VouchedApiTraceStep;
    requestBody: Record<string, unknown>;
    responseBody?: Record<string, unknown> | null;
    errorMessage?: string | null;
}): Promise<void> {
    await admin.firestore().collection('audit_logs').add({
        userId: params.uid,
        action: 'VOUCHED_API_TRACE',
        provider: 'vouched',
        workflow: WORKFLOW_VERSION,
        step: params.step,
        requestBody: params.requestBody,
        responseBody: params.responseBody ?? null,
        errorMessage: params.errorMessage ?? null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function persistWorkflowResult(result: VouchedWorkflowResult, details: {
    requiredMethod: IdentityVerificationMethod | null;
    crosscheck?: Record<string, unknown>;
    dob?: Record<string, unknown>;
}): Promise<VouchedWorkflowResult> {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const completedAt = toTimestamp();
    const verifiedAt = result.verified ? admin.firestore.FieldValue.serverTimestamp() : null;
    const historyEntry = {
        provider: 'vouched',
        workflow: WORKFLOW_VERSION,
        method: result.method,
        requiredMethod: details.requiredMethod,
        status: result.status,
        verified: result.verified,
        nextStep: result.nextStep,
        crosscheckScore: result.crosscheckScore,
        crosscheckThreshold: result.crosscheckThreshold,
        dobMatch: result.dobMatch,
        failureReason: result.failureReason,
        warningMessage: result.warningMessage,
        completedAt,
    };

    const identityVerification: Record<string, unknown> = {
        provider: 'vouched',
        workflow: WORKFLOW_VERSION,
        status: result.status,
        verified: result.verified,
        method: result.method,
        requiredMethod: details.requiredMethod,
        verifiedAt,
        lastUpdatedAt: timestamp,
        failureReason: result.failureReason,
        warningCode: null,
        warningMessage: result.warningMessage,
    };

    if (details.crosscheck) {
        identityVerification.crosscheck = details.crosscheck;
    }

    if (details.dob) {
        identityVerification.dob = details.dob;
    }

    await updateIdentityVerification(result.uid, {
        identityVerification,
        identityVerificationHistory: admin.firestore.FieldValue.arrayUnion(historyEntry),
        isIdentityVerified: result.verified,
        vouchedStatus: result.status,
        vouchedVerificationDate: verifiedAt,
        updatedAt: timestamp,
    });
    await addWorkflowAuditEntry(result.uid, result);

    logger.info('[Vouched] Persisted step-up workflow result', {
        uid: result.uid,
        status: result.status,
        verified: result.verified,
        method: result.method,
        nextStep: result.nextStep,
        crosscheckScore: result.crosscheckScore,
        dobMatch: result.dobMatch,
    });

    return result;
}

async function runCrossCheck(input: Required<VouchedWorkflowInput>): Promise<{
    requestBody: Record<string, unknown>;
    responseBody: Record<string, unknown>;
}> {
    const body: Record<string, unknown> = {
        firstName: input.firstName || undefined,
        lastName: input.lastName || undefined,
        email: input.email || undefined,
        phone: input.phone || undefined,
        address: buildAddress(input),
        ipAddress: input.ipAddress || undefined,
        darkweb: true,
    };

    const responseBody = await postVouchedJson('/api/identity/crosscheck', body);
    return {
        requestBody: body,
        responseBody,
    };
}

async function runDobVerification(input: Required<VouchedWorkflowInput>): Promise<{
    requestBody: Record<string, unknown>;
    responseBody: Record<string, unknown>;
}> {
    const body: Record<string, unknown> = {
        firstName: input.firstName || undefined,
        lastName: input.lastName || undefined,
        email: input.email || undefined,
        phone: input.phone || undefined,
        dob: input.dob || undefined,
        address: buildAddress(input),
    };

    const responseBody = await postVouchedJson('/api/dob/verify', body);
    return {
        requestBody: body,
        responseBody,
    };
}

export function verifyVouchedWebhookSignature(rawBody: string, signatureHeader: string | null | undefined): boolean {
    if (!rawBody || !signatureHeader) return false;
    return compareSignatures(createSignature(rawBody), signatureHeader);
}

export async function runVouchedStepUpWorkflow(uid: string, inputOverride: VouchedWorkflowInput = {}): Promise<VouchedWorkflowResult> {
    const threshold = getCrossCheckThreshold();
    const { source, input } = await loadWorkflowSource(uid, inputOverride);
    const existing = getExistingWorkflowResult(uid, source, threshold);
    if (existing) {
        return existing;
    }

    if ((!input.firstName && !input.lastName) || !input.phone) {
        const result: VouchedWorkflowResult = {
            uid,
            verified: false,
            status: 'pending',
            method: null,
            nextStep: 'visual_id',
            crosscheckScore: null,
            crosscheckThreshold: threshold,
            dobMatch: null,
            failureReason: 'Name and phone are required before passive identity checks can run.',
            warningMessage: 'Visual identity verification is required.',
        };

        return persistWorkflowResult(result, {
            requiredMethod: 'visual_id',
        });
    }

    const completedAt = toTimestamp();
    let crosscheckScore: number | null = null;
    let crosscheckError: string | null = null;
    let dobMatch: boolean | null = null;
    let dobError: string | null = null;

    try {
        const crosscheckResult = await runCrossCheck(input);
        crosscheckScore = extractCrossCheckScore(crosscheckResult.responseBody);
        await addVouchedApiTraceEntry({
            uid,
            step: 'crosscheck',
            requestBody: crosscheckResult.requestBody,
            responseBody: crosscheckResult.responseBody,
        });
    } catch (error) {
        crosscheckError = error instanceof Error ? error.message : 'CrossCheck failed.';
        await addVouchedApiTraceEntry({
            uid,
            step: 'crosscheck',
            requestBody: {
                firstName: input.firstName || undefined,
                lastName: input.lastName || undefined,
                email: input.email || undefined,
                phone: input.phone || undefined,
                address: buildAddress(input),
                ipAddress: input.ipAddress || undefined,
                darkweb: true,
            },
            errorMessage: crosscheckError,
        });
        logger.warn('[Vouched] CrossCheck step failed; continuing step-up workflow', {
            uid,
            error: crosscheckError,
        });
    }

    const crosscheck = {
        status: crosscheckScore !== null && crosscheckScore >= threshold ? 'verified' : 'failed',
        score: crosscheckScore,
        threshold,
        error: crosscheckError,
        completedAt,
    };

    if (crosscheckScore !== null && crosscheckScore >= threshold) {
        return persistWorkflowResult({
            uid,
            verified: true,
            status: 'verified',
            method: 'crosscheck',
            nextStep: 'none',
            crosscheckScore,
            crosscheckThreshold: threshold,
            dobMatch: null,
            failureReason: null,
            warningMessage: null,
        }, {
            requiredMethod: null,
            crosscheck,
        });
    }

    if (input.dob) {
        try {
            const dobResult = await runDobVerification(input);
            dobMatch = extractDobMatch(dobResult.responseBody);
            await addVouchedApiTraceEntry({
                uid,
                step: 'dob_verify',
                requestBody: dobResult.requestBody,
                responseBody: dobResult.responseBody,
            });
        } catch (error) {
            dobError = error instanceof Error ? error.message : 'DOB verification failed.';
            await addVouchedApiTraceEntry({
                uid,
                step: 'dob_verify',
                requestBody: {
                    firstName: input.firstName || undefined,
                    lastName: input.lastName || undefined,
                    email: input.email || undefined,
                    phone: input.phone || undefined,
                    dob: input.dob || undefined,
                    address: buildAddress(input),
                },
                errorMessage: dobError,
            });
            logger.warn('[Vouched] DOB step failed; visual verification is required', {
                uid,
                error: dobError,
            });
        }
    } else {
        dobError = 'Date of birth is missing.';
    }

    const dob = {
        status: dobMatch === true ? 'verified' : 'failed',
        dobMatch,
        error: dobError,
        completedAt: toTimestamp(),
    };

    if (dobMatch === true) {
        return persistWorkflowResult({
            uid,
            verified: true,
            status: 'verified',
            method: 'dob',
            nextStep: 'none',
            crosscheckScore,
            crosscheckThreshold: threshold,
            dobMatch,
            failureReason: null,
            warningMessage: null,
        }, {
            requiredMethod: null,
            crosscheck,
            dob,
        });
    }

    return persistWorkflowResult({
        uid,
        verified: false,
        status: 'pending',
        method: null,
        nextStep: 'visual_id',
        crosscheckScore,
        crosscheckThreshold: threshold,
        dobMatch,
        failureReason: dobError ?? crosscheckError ?? 'Passive identity checks did not meet the required threshold.',
        warningMessage: 'Visual identity verification is required.',
    }, {
        requiredMethod: 'visual_id',
        crosscheck,
        dob,
    });
}

export async function fetchVouchedJob(jobId: string): Promise<Record<string, unknown>> {
    const privateKey = getVouchedPrivateKey();
    logger.info('[Vouched] Fetching job', {
        jobId,
        apiKeySource: 'VOUCHED_PRIVATE_KEY',
        apiKeyPreview: maskSecret(privateKey),
        headerNames: ['Content-Type', 'X-API-Key'],
    });

    const response = await fetch(`https://verify.vouched.id/api/jobs/${encodeURIComponent(jobId)}`, {
        headers: {
            'X-API-Key': privateKey,
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
