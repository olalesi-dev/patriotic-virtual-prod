import { CloudTasksClient } from '@google-cloud/tasks';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import type { Request } from 'express';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { applyDoseSpotClinicianWebhookEvent } from './dosespot-clinicians';
import { syncDoseSpotPatientSummary } from './dosespot-summary-sync';

const tasksClient = new CloudTasksClient();
const oidcClient = new OAuth2Client();

const WEBHOOK_EVENTS_COLLECTION = 'dosespotWebhookEvents';
const INTERNAL_EVENTS_COLLECTION = 'dosespotInternalEvents';
const NOTIFICATIONS_COLLECTION = 'notifications';
const REFILLS_ERRORS_HREF = '/orders/erx?refillsErrors=true';
const READINESS_HREF = '/orders/erx/readiness';

const PROCESSING_LEASE_MS = 5 * 60 * 1000;

const SUPPORTED_EVENT_TYPES = new Set([
    'ClinicianConfirmed',
    'PrescriberNotificationCounts',
    'PrescriptionResult',
    'MedicationStatusUpdate',
    'ClinicianLockedOut',
    'ClinicianIDPCompleteSuccess',
    'ClinicianTfaActivateSuccess',
    'ClinicianTfaDeactivateSuccess',
    'ClinicianPINReset',
    'SelfReportedMedicationStatusUpdate',
    'PharmacyStatusUpdate',
    'PriorAuthorizationStatusUpdate',
    'PatientStatusUpdate',
    'AllergyStatusUpdate',
    'PharmacyTransfer'
]);

export type DoseSpotProcessingStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
export type DoseSpotPriority = 'low' | 'medium' | 'high';
export type DoseSpotNotificationType =
    | 'dosespot_rx_counts'
    | 'dosespot_rx_error'
    | 'dosespot_medication_status'
    | 'dosespot_prior_auth'
    | 'dosespot_pharmacy_transfer'
    | 'dosespot_clinician_security'
    | 'dosespot_sync_update';

interface DoseSpotCounts {
    pendingPrescriptions: number;
    transmissionErrors: number;
    refillRequests: number;
    changeRequests: number;
    total: number;
}

interface DoseSpotReferenceIds {
    clinicianId: number | null;
    prescriberId: number | null;
    patientId: number | null;
    clinicId: number | null;
    prescriptionId: number | null;
    relatedRxRequestQueueItemId: number | null;
    relatedRxChangeQueueItemId: number | null;
    priorAuthorizationCaseId: number | null;
    selfReportedMedicationId: number | null;
    patientAllergyId: number | null;
    pharmacyId: number | null;
    originalPharmacyId: number | null;
    newPharmacyId: number | null;
    agentId: number | null;
}

interface NotificationDraft {
    type: DoseSpotNotificationType;
    title: string;
    body: string;
    href: string;
    priority: DoseSpotPriority;
    sendPush: boolean;
    metadata?: Record<string, unknown>;
}

interface DoseSpotNormalizedEvent {
    eventType: string;
    internalType: string;
    priority: DoseSpotPriority;
    referenceIds: DoseSpotReferenceIds;
    payload: Record<string, unknown>;
    counts?: DoseSpotCounts;
    notification: NotificationDraft | null;
}

interface PersistWebhookEventInput {
    payload: Record<string, unknown>;
    headers: Request['headers'];
    authorizationValid: boolean;
    receivedAt: Date;
}

interface PersistWebhookEventResult {
    eventId: string;
    dedupeKey: string;
    eventType: string;
    duplicate: boolean;
    shouldEnqueue: boolean;
}

interface EnqueueTaskResult {
    mode: 'cloud_tasks' | 'inline_fallback';
    taskName?: string;
}

interface ProcessResult {
    alreadyProcessed: boolean;
    notificationId: string | null;
    recipientId: string | null;
    internalType: string | null;
}

interface DevTestActivityResult {
    clinicianId: number;
    autoLinked: boolean;
    eventIds: string[];
    notificationIds: string[];
}

interface TaskProcessorPayload {
    eventId: string;
}

interface QueueConfig {
    projectId: string;
    location: string;
    queue: string;
    targetUrl: string;
    audience: string;
    serviceAccountEmail: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const normalized = value.trim();
        if (!normalized) return null;
        const parsed = Number.parseInt(normalized, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function asBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return null;
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

function toPlainValue(value: unknown): unknown {
    if (value === undefined) return null;
    if (value === null) return null;
    if (Array.isArray(value)) {
        return value.map((entry) => toPlainValue(entry));
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (isRecord(value)) {
        const output: Record<string, unknown> = {};
        for (const key of Object.keys(value)) {
            const normalized = toPlainValue(value[key]);
            if (normalized !== undefined) {
                output[key] = normalized;
            }
        }
        return output;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return String(value);
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
    }

    if (isRecord(value)) {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }

    return JSON.stringify(value ?? null);
}

function sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function compareStrings(left: string, right: string): boolean {
    try {
        return crypto.timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
    } catch {
        return false;
    }
}

function sanitizeHeaders(headers: Request['headers']): Record<string, string> {
    const output: Record<string, string> = {};

    for (const [key, rawValue] of Object.entries(headers)) {
        if (rawValue === undefined) continue;
        if (key.toLowerCase() === 'authorization') {
            output[key] = '[REDACTED]';
            continue;
        }

        output[key] = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue);
    }

    return output;
}

function buildTestClinicianId(uid: string): number {
    const digest = sha256(uid).slice(0, 8);
    const numeric = Number.parseInt(digest, 16);
    return 1_000_000 + (numeric % 8_000_000);
}

function readWebhookSecret(): string | null {
    return asNonEmptyString(process.env.DOSESPOT_WEBHOOK_SECRET)
        ?? asNonEmptyString(process.env.DOSESPOT_SECRET_KEY);
}

export function verifyDoseSpotSecret(req: Request): boolean {
    const webhookSecret = readWebhookSecret();
    if (!webhookSecret) {
        logger.warn('[DoseSpot Webhook] No webhook secret configured');
        return process.env.NODE_ENV !== 'production';
    }

    const authHeader = asNonEmptyString(req.headers.authorization);
    if (!authHeader) {
        logger.warn('[DoseSpot Webhook] Missing Authorization header');
        return false;
    }

    const expectedHeader = `Secret ${webhookSecret}`;
    const matches = compareStrings(authHeader, expectedHeader);
    if (!matches) {
        logger.warn('[DoseSpot Webhook] Secret mismatch');
    }
    return matches;
}

export function extractEventType(payload: Record<string, unknown>): string | null {
    return asNonEmptyString(payload.EventType)?.trim() ?? null;
}

function getDataObject(payload: Record<string, unknown>): Record<string, unknown> {
    return isRecord(payload.Data) ? payload.Data : payload;
}

function isSupportedEventType(eventType: string): boolean {
    return SUPPORTED_EVENT_TYPES.has(eventType);
}

function computeDedupeKey(payload: Record<string, unknown>): string {
    return sha256(stableStringify(toPlainValue(payload)));
}

function getReferenceIds(payload: Record<string, unknown>): DoseSpotReferenceIds {
    const data = getDataObject(payload);
    const top = payload;

    return {
        clinicianId: asNumber(data.ClinicianId) ?? asNumber(top.ClinicianId),
        prescriberId: asNumber(data.PrescriberId) ?? asNumber(top.PrescriberId),
        patientId: asNumber(data.PatientId) ?? asNumber(top.PatientId),
        clinicId: asNumber(data.ClinicId) ?? asNumber(top.ClinicId),
        prescriptionId: asNumber(data.PrescriptionId) ?? asNumber(top.PrescriptionId),
        relatedRxRequestQueueItemId: asNumber(data.RelatedRxRequestQueueItemId) ?? asNumber(top.RelatedRxRequestQueueItemId),
        relatedRxChangeQueueItemId: asNumber(data.RelatedRxChangeQueueItemId) ?? asNumber(top.RelatedRxChangeQueueItemId),
        priorAuthorizationCaseId: asNumber(data.PriorAuthorizationCaseId) ?? asNumber(top.PriorAuthorizationCaseId),
        selfReportedMedicationId: asNumber(data.SelfReportedMedicationId) ?? asNumber(top.SelfReportedMedicationId),
        patientAllergyId: asNumber(data.PatientAllergyId) ?? asNumber(top.PatientAllergyId),
        pharmacyId: asNumber(data.PharmacyId) ?? asNumber(top.PharmacyId),
        originalPharmacyId: asNumber(top.OriginalPharmacyId),
        newPharmacyId: asNumber(top.NewPharmacyId),
        agentId: asNumber(data.AgentId) ?? asNumber(top.AgentId)
    };
}

function getRecipientClinicianId(referenceIds: DoseSpotReferenceIds): number | null {
    return referenceIds.clinicianId ?? referenceIds.prescriberId;
}

function parseCountsFromRecord(record: Record<string, unknown> | null | undefined): DoseSpotCounts {
    const source = record ?? {};
    const pendingPrescriptions = asNumber(source.PendingPrescriptionCount ?? source.pendingPrescriptions) ?? 0;
    const transmissionErrors = asNumber(source.TransmissionErrorCount ?? source.transmissionErrors) ?? 0;
    const refillRequests = asNumber(source.RefillRequestCount ?? source.refillRequests) ?? 0;
    const changeRequests = asNumber(source.ChangeRequestCount ?? source.changeRequests) ?? 0;

    return {
        pendingPrescriptions,
        transmissionErrors,
        refillRequests,
        changeRequests,
        total: pendingPrescriptions + transmissionErrors + refillRequests + changeRequests
    };
}

function getCounts(payload: Record<string, unknown>): DoseSpotCounts {
    const data = getDataObject(payload);
    const totals = isRecord(data.Total) ? data.Total : data;
    return parseCountsFromRecord(totals);
}

function getMedicationStatusLabel(status: number | null): string {
    switch (status) {
        case 3:
            return 'discontinued';
        case 4:
            return 'deleted';
        case 5:
            return 'completed';
        case 8:
            return 'cancelled';
        case 9:
            return 'cancel denied';
        case 11:
            return 'fully filled';
        case 12:
            return 'partially filled';
        case 13:
            return 'not filled';
        default:
            return 'updated';
    }
}

function sanitizeText(value: string, maxLength: number): string {
    return value
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, maxLength);
}

function buildDeepLink(eventType: string, patientUid: string | null): string {
    if (
        patientUid &&
        ['MedicationStatusUpdate', 'SelfReportedMedicationStatusUpdate', 'PatientStatusUpdate', 'AllergyStatusUpdate', 'PharmacyStatusUpdate'].includes(eventType)
    ) {
        return `/patients/${patientUid}`;
    }

    if (
        ['ClinicianLockedOut', 'ClinicianIDPCompleteSuccess', 'ClinicianTfaActivateSuccess', 'ClinicianTfaDeactivateSuccess', 'ClinicianPINReset', 'ClinicianConfirmed'].includes(eventType)
    ) {
        return READINESS_HREF;
    }

    return '/orders/erx';
}

function buildCountsNotification(nextCounts: DoseSpotCounts, previousCounts: DoseSpotCounts): NotificationDraft | null {
    const increased =
        nextCounts.pendingPrescriptions > previousCounts.pendingPrescriptions ||
        nextCounts.transmissionErrors > previousCounts.transmissionErrors ||
        nextCounts.refillRequests > previousCounts.refillRequests ||
        nextCounts.changeRequests > previousCounts.changeRequests;

    if (!increased) {
        return null;
    }

    const criticalRaised =
        (previousCounts.transmissionErrors === 0 && nextCounts.transmissionErrors > 0) ||
        (previousCounts.changeRequests === 0 && nextCounts.changeRequests > 0);

    const summary: string[] = [];
    if (nextCounts.pendingPrescriptions > 0) summary.push(`${nextCounts.pendingPrescriptions} pending`);
    if (nextCounts.refillRequests > 0) summary.push(`${nextCounts.refillRequests} refill`);
    if (nextCounts.changeRequests > 0) summary.push(`${nextCounts.changeRequests} change request`);
    if (nextCounts.transmissionErrors > 0) summary.push(`${nextCounts.transmissionErrors} transmission error`);

    const body = criticalRaised
        ? 'DoseSpot reported prescription activity that requires review.'
        : `DoseSpot updated your eRx queue: ${summary.join(', ')}.`;

    return {
        type: 'dosespot_rx_counts',
        title: criticalRaised ? 'eRx action required' : 'New eRx activity',
        body: sanitizeText(body, 280),
        href: REFILLS_ERRORS_HREF,
        priority: criticalRaised ? 'high' : 'medium',
        sendPush: criticalRaised,
        metadata: {
            counts: nextCounts
        }
    };
}

function buildNormalizedEvent(
    payload: Record<string, unknown>,
    patientUid: string | null,
    previousCounts: DoseSpotCounts
): DoseSpotNormalizedEvent {
    const eventType = extractEventType(payload) ?? 'Unknown';
    const data = getDataObject(payload);
    const referenceIds = getReferenceIds(payload);
    const deepLink = buildDeepLink(eventType, patientUid);

    switch (eventType) {
        case 'PrescriberNotificationCounts': {
            const counts = getCounts(payload);
            return {
                eventType,
                internalType: 'RX_COUNTS_CHANGED',
                priority: (counts.transmissionErrors > 0 || counts.changeRequests > 0) ? 'high' : 'medium',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                counts,
                notification: buildCountsNotification(counts, previousCounts)
            };
        }
        case 'PrescriptionResult': {
            const statusDetails = sanitizeText(asNonEmptyString(data.StatusDetails) ?? '', 240);
            const lowerDetails = statusDetails.toLowerCase();
            const isError =
                lowerDetails.includes('error') ||
                lowerDetails.includes('unable') ||
                lowerDetails.includes('fail') ||
                lowerDetails.includes('denied') ||
                lowerDetails.includes('reject');

            return {
                eventType,
                internalType: 'RX_FINAL_STATUS_CHANGED',
                priority: isError ? 'high' : 'low',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: isError ? {
                    type: 'dosespot_rx_error',
                    title: 'Prescription delivery issue',
                    body: 'DoseSpot reported a prescription error that needs review.',
                    href: REFILLS_ERRORS_HREF,
                    priority: 'high',
                    sendPush: true,
                    metadata: {
                        prescriptionStatus: asNumber(data.PrescriptionStatus),
                        statusDetails
                    }
                } : null
            };
        }
        case 'MedicationStatusUpdate': {
            const medicationStatus = asNumber(data.MedicationStatus);
            const statusLabel = getMedicationStatusLabel(medicationStatus);
            const priority = [8, 9, 13].includes(medicationStatus ?? -1) ? 'medium' : 'low';

            return {
                eventType,
                internalType: 'MEDICATION_STATUS_CHANGED',
                priority,
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_medication_status',
                    title: 'Medication status updated',
                    body: `DoseSpot reported a medication status update: ${statusLabel}.`,
                    href: deepLink,
                    priority,
                    sendPush: false,
                    metadata: {
                        medicationStatus,
                        statusNotes: sanitizeText(asNonEmptyString(data.StatusNotes) ?? '', 240)
                    }
                }
            };
        }
        case 'PriorAuthorizationStatusUpdate': {
            const status = sanitizeText(asNonEmptyString(data.PriorAuthorizationCaseStatus) ?? 'updated', 80);
            const lowerStatus = status.toLowerCase();
            const highPriority =
                lowerStatus.includes('denied') ||
                lowerStatus.includes('deleted') ||
                lowerStatus.includes('error') ||
                lowerStatus.includes('cancel');

            return {
                eventType,
                internalType: 'PRIOR_AUTH_STATUS_CHANGED',
                priority: highPriority ? 'high' : 'medium',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_prior_auth',
                    title: 'Prior authorization update',
                    body: highPriority
                        ? 'DoseSpot reported a prior authorization update that needs review.'
                        : 'DoseSpot reported a prior authorization update.',
                    href: '/orders/erx',
                    priority: highPriority ? 'high' : 'medium',
                    sendPush: highPriority,
                    metadata: {
                        priorAuthorizationCaseStatus: status
                    }
                }
            };
        }
        case 'PharmacyTransfer': {
            const hasPharmacyChanged = asBoolean(payload.HasPharmacyChanged) ?? false;
            return {
                eventType,
                internalType: 'PHARMACY_TRANSFER',
                priority: hasPharmacyChanged ? 'medium' : 'low',
                referenceIds,
                payload: toPlainValue(getDataObject(payload)) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_pharmacy_transfer',
                    title: 'Pharmacy transfer update',
                    body: hasPharmacyChanged
                        ? 'DoseSpot reported a pharmacy transfer selection change.'
                        : 'DoseSpot completed a pharmacy transfer workflow update.',
                    href: '/orders/erx',
                    priority: hasPharmacyChanged ? 'medium' : 'low',
                    sendPush: hasPharmacyChanged,
                    metadata: {
                        hasPharmacyChanged,
                        additionalNotes: sanitizeText(asNonEmptyString(payload.AdditionalNotes) ?? '', 240)
                    }
                }
            };
        }
        case 'ClinicianLockedOut':
            return {
                eventType,
                internalType: 'CLINICIAN_SECURITY_EVENT',
                priority: 'high',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_clinician_security',
                    title: 'DoseSpot account locked',
                    body: 'DoseSpot reported that your prescribing account is locked and needs attention.',
                    href: READINESS_HREF,
                    priority: 'high',
                    sendPush: true
                }
            };
        case 'ClinicianPINReset':
            return {
                eventType,
                internalType: 'CLINICIAN_SECURITY_EVENT',
                priority: 'high',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_clinician_security',
                    title: 'DoseSpot PIN reset',
                    body: 'DoseSpot reported a clinician PIN reset.',
                    href: READINESS_HREF,
                    priority: 'high',
                    sendPush: true
                }
            };
        case 'ClinicianTfaDeactivateSuccess':
            return {
                eventType,
                internalType: 'CLINICIAN_SECURITY_EVENT',
                priority: 'high',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_clinician_security',
                    title: 'DoseSpot two-factor disabled',
                    body: 'DoseSpot reported that two-factor authentication was disabled.',
                    href: READINESS_HREF,
                    priority: 'high',
                    sendPush: true
                }
            };
        case 'ClinicianTfaActivateSuccess':
            return {
                eventType,
                internalType: 'CLINICIAN_ACCOUNT_EVENT',
                priority: 'medium',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_clinician_security',
                    title: 'DoseSpot two-factor enabled',
                    body: 'DoseSpot reported that two-factor authentication was enabled.',
                    href: READINESS_HREF,
                    priority: 'medium',
                    sendPush: false
                }
            };
        case 'ClinicianIDPCompleteSuccess':
            return {
                eventType,
                internalType: 'CLINICIAN_ACCOUNT_EVENT',
                priority: 'low',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_sync_update',
                    title: 'DoseSpot verification complete',
                    body: 'DoseSpot reported that clinician identity proofing completed successfully.',
                    href: READINESS_HREF,
                    priority: 'low',
                    sendPush: false
                }
            };
        case 'ClinicianConfirmed':
            return {
                eventType,
                internalType: 'CLINICIAN_ACCOUNT_EVENT',
                priority: 'medium',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_sync_update',
                    title: 'DoseSpot clinician confirmed',
                    body: 'DoseSpot reported that your clinician record was confirmed.',
                    href: READINESS_HREF,
                    priority: 'medium',
                    sendPush: false
                }
            };
        case 'SelfReportedMedicationStatusUpdate':
            return {
                eventType,
                internalType: 'SELF_REPORTED_MEDICATION_STATUS_CHANGED',
                priority: 'low',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_sync_update',
                    title: 'Self-reported medication updated',
                    body: 'DoseSpot synced a self-reported medication update.',
                    href: deepLink,
                    priority: 'low',
                    sendPush: false
                }
            };
        case 'PharmacyStatusUpdate':
            return {
                eventType,
                internalType: 'PHARMACY_STATUS_CHANGED',
                priority: 'low',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_sync_update',
                    title: 'Pharmacy update synced',
                    body: 'DoseSpot synced a pharmacy update.',
                    href: deepLink,
                    priority: 'low',
                    sendPush: false
                }
            };
        case 'PatientStatusUpdate':
            return {
                eventType,
                internalType: 'PATIENT_STATUS_CHANGED',
                priority: 'low',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_sync_update',
                    title: 'Patient chart update synced',
                    body: 'DoseSpot synced a patient chart update.',
                    href: deepLink,
                    priority: 'low',
                    sendPush: false
                }
            };
        case 'AllergyStatusUpdate':
            return {
                eventType,
                internalType: 'ALLERGY_STATUS_CHANGED',
                priority: 'low',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: {
                    type: 'dosespot_sync_update',
                    title: 'Allergy update synced',
                    body: 'DoseSpot synced an allergy update.',
                    href: deepLink,
                    priority: 'low',
                    sendPush: false
                }
            };
        default:
            return {
                eventType,
                internalType: isSupportedEventType(eventType) ? 'DOSESPOT_EVENT' : 'UNKNOWN_DOSESPOT_EVENT',
                priority: 'low',
                referenceIds,
                payload: toPlainValue(data) as Record<string, unknown>,
                notification: null
            };
    }
}

async function resolveRecipientId(clinicianId: number | null): Promise<string | null> {
    if (!clinicianId) return null;

    const users = admin.firestore().collection('users');
    const numericQuery = await users.where('doseSpotClinicianId', '==', clinicianId).limit(1).get();
    if (!numericQuery.empty) return numericQuery.docs[0].id;

    const stringQuery = await users.where('doseSpotClinicianId', '==', clinicianId.toString()).limit(1).get();
    if (!stringQuery.empty) return stringQuery.docs[0].id;

    return null;
}

async function resolvePatientUid(patientId: number | null): Promise<string | null> {
    if (!patientId) return null;

    const patients = admin.firestore().collection('patients');
    const numericQuery = await patients.where('doseSpotPatientId', '==', patientId).limit(1).get();
    if (!numericQuery.empty) return numericQuery.docs[0].id;

    const stringQuery = await patients.where('doseSpotPatientId', '==', patientId.toString()).limit(1).get();
    if (!stringQuery.empty) return stringQuery.docs[0].id;

    return null;
}

function getQueueConfig(): QueueConfig | null {
    const projectId = asNonEmptyString(process.env.CLOUD_TASKS_PROJECT_ID)
        ?? asNonEmptyString(process.env.GOOGLE_CLOUD_PROJECT)
        ?? asNonEmptyString(process.env.GCLOUD_PROJECT)
        ?? asNonEmptyString(process.env.FIREBASE_PROJECT_ID);
    const location = asNonEmptyString(process.env.CLOUD_TASKS_LOCATION);
    const queue = asNonEmptyString(process.env.CLOUD_TASKS_QUEUE);
    const targetUrl = asNonEmptyString(process.env.CLOUD_TASKS_TARGET_URL);

    if (!projectId || !location || !queue || !targetUrl) {
        return null;
    }

    return {
        projectId,
        location,
        queue,
        targetUrl,
        audience: asNonEmptyString(process.env.CLOUD_TASKS_AUDIENCE) ?? targetUrl,
        serviceAccountEmail: asNonEmptyString(process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL)
    };
}

function allowInlineFallback(): boolean {
    return process.env.NODE_ENV !== 'production';
}

export function getDoseSpotWebhookRuntimeHealth() {
    const queueConfig = getQueueConfig();
    return {
        queueConfigured: queueConfig !== null,
        queueMode: queueConfig ? 'cloud_tasks' : (allowInlineFallback() ? 'inline_fallback' : 'unconfigured'),
        inlineFallbackEnabled: allowInlineFallback(),
        webhookSecretConfigured: Boolean(readWebhookSecret()),
        queue: queueConfig ? {
            projectId: queueConfig.projectId,
            location: queueConfig.location,
            queue: queueConfig.queue,
            targetUrl: queueConfig.targetUrl,
            audience: queueConfig.audience,
            serviceAccountEmailConfigured: Boolean(queueConfig.serviceAccountEmail)
        } : null
    };
}

export async function verifyDoseSpotTaskRequest(req: Request): Promise<boolean> {
    const authHeader = asNonEmptyString(req.headers.authorization);
    const queueConfig = getQueueConfig();

    if (!authHeader) {
        return allowInlineFallback() && queueConfig === null;
    }

    if (!authHeader.startsWith('Bearer ')) {
        return false;
    }

    if (!queueConfig) {
        return allowInlineFallback();
    }

    try {
        const idToken = authHeader.slice('Bearer '.length).trim();
        const ticket = await oidcClient.verifyIdToken({
            idToken,
            audience: queueConfig.audience
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return false;
        }

        if (queueConfig.serviceAccountEmail && payload.email !== queueConfig.serviceAccountEmail) {
            logger.warn('[DoseSpot Webhook] Cloud Tasks token email mismatch');
            return false;
        }

        return true;
    } catch (error) {
        logger.warn('[DoseSpot Webhook] Cloud Tasks auth verification failed', {
            error: error instanceof Error ? error.message : String(error)
        });
        return false;
    }
}

export async function persistWebhookEvent(input: PersistWebhookEventInput): Promise<PersistWebhookEventResult> {
    const eventType = extractEventType(input.payload) ?? 'Unknown';
    const dedupeKey = computeDedupeKey(input.payload);
    const referenceIds = getReferenceIds(input.payload);
    const docRef = admin.firestore().collection(WEBHOOK_EVENTS_COLLECTION).doc(dedupeKey);

    let duplicate = false;
    let shouldEnqueue = false;

    await admin.firestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);

        if (!snapshot.exists) {
            shouldEnqueue = true;
            transaction.set(docRef, {
                dedupeKey,
                eventType,
                payloadJson: toPlainValue(input.payload),
                headersJson: sanitizeHeaders(input.headers),
                authorizationValid: input.authorizationValid,
                deliveryCount: 1,
                processingStatus: 'PENDING' as DoseSpotProcessingStatus,
                receivedAt: input.receivedAt,
                firstReceivedAt: input.receivedAt,
                lastReceivedAt: input.receivedAt,
                processedAt: null,
                errorMessage: null,
                queueMode: null,
                taskName: null,
                clinicianId: getRecipientClinicianId(referenceIds),
                patientId: referenceIds.patientId,
                payloadHash: dedupeKey,
                supportedEventType: isSupportedEventType(eventType),
                createdAt: input.receivedAt,
                updatedAt: input.receivedAt
            });
            return;
        }

        duplicate = true;
        const existing = snapshot.data() as Record<string, unknown>;
        const status = asNonEmptyString(existing.processingStatus) as DoseSpotProcessingStatus | null;
        shouldEnqueue = status === 'FAILED';

        transaction.set(docRef, {
            headersJson: sanitizeHeaders(input.headers),
            authorizationValid: input.authorizationValid,
            deliveryCount: admin.firestore.FieldValue.increment(1),
            lastReceivedAt: input.receivedAt,
            updatedAt: input.receivedAt,
            processingStatus: shouldEnqueue ? 'PENDING' : status,
            errorMessage: shouldEnqueue ? null : existing.errorMessage ?? null
        }, { merge: true });
    });

    return {
        eventId: docRef.id,
        dedupeKey,
        eventType,
        duplicate,
        shouldEnqueue
    };
}

export async function markWebhookEventQueued(eventId: string, enqueueResult: EnqueueTaskResult): Promise<void> {
    const patch: Record<string, unknown> = {
        processingStatus: 'QUEUED',
        queueMode: enqueueResult.mode,
        updatedAt: new Date()
    };

    if (enqueueResult.taskName) {
        patch.taskName = enqueueResult.taskName;
        patch.enqueuedAt = new Date();
    }

    await admin.firestore().collection(WEBHOOK_EVENTS_COLLECTION).doc(eventId).set(patch, { merge: true });
}

export async function markWebhookEventFailed(eventId: string, error: unknown): Promise<void> {
    await admin.firestore().collection(WEBHOOK_EVENTS_COLLECTION).doc(eventId).set({
        processingStatus: 'FAILED',
        errorMessage: sanitizeText(error instanceof Error ? error.message : String(error), 500),
        updatedAt: new Date()
    }, { merge: true });
}

export async function enqueueWebhookProcessing(eventId: string): Promise<EnqueueTaskResult> {
    const queueConfig = getQueueConfig();

    if (!queueConfig) {
        if (allowInlineFallback()) {
            return { mode: 'inline_fallback' };
        }

        throw new Error('Cloud Tasks is not configured for DoseSpot webhook processing.');
    }

    if (!queueConfig.serviceAccountEmail && !allowInlineFallback()) {
        throw new Error('CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL must be configured for production DoseSpot processing.');
    }

    const parent = tasksClient.queuePath(queueConfig.projectId, queueConfig.location, queueConfig.queue);
    const payload: TaskProcessorPayload = { eventId };
    const task: any = {
        httpRequest: {
            httpMethod: 'POST',
            url: queueConfig.targetUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            body: Buffer.from(JSON.stringify(payload)).toString('base64')
        }
    };

    if (queueConfig.serviceAccountEmail) {
        task.httpRequest.oidcToken = {
            serviceAccountEmail: queueConfig.serviceAccountEmail,
            audience: queueConfig.audience
        };
    }

    const [response] = await tasksClient.createTask({
        parent,
        task
    });

    return {
        mode: 'cloud_tasks',
        taskName: response.name ?? undefined
    };
}

export function scheduleInlineWebhookProcessing(eventId: string): void {
    setImmediate(() => {
        void processWebhookEvent(eventId).catch((error) => {
            logger.error('[DoseSpot Webhook] Inline processing failed', {
                eventId,
                error: error instanceof Error ? error.message : String(error)
            });
        });
    });
}

async function acquireProcessingLease(eventId: string): Promise<Record<string, unknown> | null> {
    const docRef = admin.firestore().collection(WEBHOOK_EVENTS_COLLECTION).doc(eventId);
    let eventData: Record<string, unknown> | null = null;
    let acquired = false;
    const now = new Date();

    await admin.firestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);
        if (!snapshot.exists) {
            return;
        }

        const data = snapshot.data() as Record<string, unknown>;
        eventData = data;

        const status = asNonEmptyString(data.processingStatus) as DoseSpotProcessingStatus | null;
        const startedAt = asDate(data.processingStartedAt);
        const leaseActive = status === 'PROCESSING' && startedAt !== null && (now.getTime() - startedAt.getTime()) < PROCESSING_LEASE_MS;

        if (status === 'SUCCESS' || leaseActive) {
            return;
        }

        acquired = true;
        transaction.set(docRef, {
            processingStatus: 'PROCESSING',
            processingStartedAt: now,
            processingAttempts: admin.firestore.FieldValue.increment(1),
            updatedAt: now,
            errorMessage: null
        }, { merge: true });
    });

    return acquired ? eventData : null;
}

async function upsertCountsDocument(recipientId: string, counts: DoseSpotCounts, clinicianId: number | null, eventId: string): Promise<void> {
    await admin.firestore()
        .collection('users')
        .doc(recipientId)
        .collection('dosespot')
        .doc('notifications')
        .set({
            pendingPrescriptions: counts.pendingPrescriptions,
            transmissionErrors: counts.transmissionErrors,
            refillRequests: counts.refillRequests,
            changeRequests: counts.changeRequests,
            total: counts.total,
            sourceClinicianId: clinicianId,
            lastEventId: eventId,
            lastUpdated: new Date()
        }, { merge: true });
}

async function getExistingCounts(recipientId: string): Promise<DoseSpotCounts> {
    const snapshot = await admin.firestore()
        .collection('users')
        .doc(recipientId)
        .collection('dosespot')
        .doc('notifications')
        .get();

    if (!snapshot.exists) {
        return {
            pendingPrescriptions: 0,
            transmissionErrors: 0,
            refillRequests: 0,
            changeRequests: 0,
            total: 0
        };
    }

    return parseCountsFromRecord(snapshot.data() as Record<string, unknown>);
}

export async function ensureDoseSpotTestClinicianForUser(
    uid: string,
    requestedClinicianId?: number | null
): Promise<{ clinicianId: number; autoLinked: boolean }> {
    const userRef = admin.firestore().collection('users').doc(uid);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
        throw new Error('Current user profile was not found in Firestore.');
    }

    const existingClinicianId = asNumber(userSnapshot.data()?.doseSpotClinicianId);
    if (existingClinicianId && requestedClinicianId == null) {
        return {
            clinicianId: existingClinicianId,
            autoLinked: false
        };
    }

    const clinicianId = requestedClinicianId ?? buildTestClinicianId(uid);
    const autoLinked = existingClinicianId !== clinicianId;

    if (autoLinked) {
        await userRef.set({
            doseSpotClinicianId: clinicianId,
            updatedAt: new Date()
        }, { merge: true });
    }

    return {
        clinicianId,
        autoLinked
    };
}

async function ingestTestPayload(payload: Record<string, unknown>): Promise<ProcessResult & { eventId: string }> {
    const persisted = await persistWebhookEvent({
        payload,
        headers: { 'x-dosespot-dev-helper': 'true' },
        authorizationValid: true,
        receivedAt: new Date()
    });

    await markWebhookEventQueued(persisted.eventId, { mode: 'inline_fallback' });
    const result = await processWebhookEvent(persisted.eventId);

    return {
        eventId: persisted.eventId,
        ...result
    };
}

export async function triggerDoseSpotDevTestActivity(uid: string): Promise<DevTestActivityResult> {
    const { clinicianId, autoLinked } = await ensureDoseSpotTestClinicianForUser(uid);
    const existingCounts = await getExistingCounts(uid);
    const timestamp = new Date().toISOString();
    const testNonce = crypto.randomUUID();

    const countsPayload: Record<string, unknown> = {
        EventType: 'PrescriberNotificationCounts',
        Data: {
            ClinicianId: clinicianId,
            Total: {
                PendingPrescriptionCount: existingCounts.pendingPrescriptions + 1,
                TransmissionErrorCount: existingCounts.transmissionErrors,
                RefillRequestCount: existingCounts.refillRequests,
                ChangeRequestCount: existingCounts.changeRequests
            },
            DevTestNonce: testNonce,
            GeneratedAt: timestamp
        }
    };

    const prescriptionPayload: Record<string, unknown> = {
        EventType: 'PrescriptionResult',
        Data: {
            ClinicianId: clinicianId,
            PrescriptionId: Date.now(),
            PrescriptionStatus: 13,
            StatusDetails: `Unable to connect to remote server (${timestamp})`,
            DevTestNonce: crypto.randomUUID()
        }
    };

    const results = await Promise.all([
        ingestTestPayload(countsPayload),
        ingestTestPayload(prescriptionPayload)
    ]);

    return {
        clinicianId,
        autoLinked,
        eventIds: results.map((result) => result.eventId),
        notificationIds: results
            .map((result) => result.notificationId)
            .filter((notificationId): notificationId is string => Boolean(notificationId))
    };
}

async function sendPushNotification(notificationId: string, recipientId: string, draft: NotificationDraft): Promise<boolean> {
    const userDoc = await admin.firestore().collection('users').doc(recipientId).get();
    if (!userDoc.exists) return false;

    const userData = userDoc.data() ?? {};
    const rawTokens = Array.isArray(userData.fcmTokens)
        ? userData.fcmTokens
        : [userData.fcmToken];

    const tokens = rawTokens
        .filter((token): token is string => typeof token === 'string' && token.trim().length > 0)
        .map((token) => token.trim())
        .slice(0, 20);

    if (tokens.length === 0) {
        return false;
    }

    const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
            title: draft.title,
            body: draft.body
        },
        data: {
            notificationId,
            type: draft.type,
            href: draft.href,
            source: 'dosespot',
            nonce: crypto.randomUUID().slice(0, 8)
        },
        webpush: {
            fcmOptions: {
                link: draft.href
            }
        }
    });

    if (response.failureCount > 0) {
        const invalidTokens = response.responses
            .map((item, index) => ({ item, token: tokens[index] }))
            .filter(({ item }) => item.success === false)
            .map(({ token }) => token);

        if (invalidTokens.length > 0) {
            const deduped = new Set<string>(invalidTokens);
            const cleanedTokens = tokens.filter((token) => !deduped.has(token));
            await admin.firestore().collection('users').doc(recipientId).set({
                fcmTokens: cleanedTokens,
                updatedAt: new Date()
            }, { merge: true });
        }
    }

    return response.successCount > 0;
}

async function upsertNotification(
    eventId: string,
    recipientId: string,
    draft: NotificationDraft,
    normalizedEvent: DoseSpotNormalizedEvent
): Promise<{ notificationId: string; pushSent: boolean }> {
    const notificationId = `dosespot_${eventId}`;
    const notificationRef = admin.firestore().collection(NOTIFICATIONS_COLLECTION).doc(notificationId);
    const now = new Date();
    const existingSnapshot = await notificationRef.get();
    const existingData = existingSnapshot.exists ? existingSnapshot.data() as Record<string, unknown> : null;

    const payload = {
        recipientId,
        actorId: null,
        actorName: 'DoseSpot',
        type: draft.type,
        title: sanitizeText(draft.title, 140),
        body: sanitizeText(draft.body, 280),
        href: draft.href,
        read: false,
        metadata: {
            ...(draft.metadata ?? {}),
            dosespotEventType: normalizedEvent.eventType,
            internalEventType: normalizedEvent.internalType,
            referenceIds: normalizedEvent.referenceIds,
            rawEventId: eventId
        },
        actionStatus: null,
        priority: draft.priority,
        source: 'dosespot',
        updatedAt: now,
        createdAt: existingData?.createdAt ?? now
    };

    await notificationRef.set(payload, { merge: true });

    let pushSent = false;
    if (draft.sendPush && !existingData?.pushSentAt) {
        pushSent = await sendPushNotification(notificationId, recipientId, draft);
        if (pushSent) {
            await notificationRef.set({
                pushSentAt: now,
                updatedAt: now
            }, { merge: true });
        }
    }

    return { notificationId, pushSent };
}

export async function processWebhookEvent(eventId: string): Promise<ProcessResult> {
    const eventData = await acquireProcessingLease(eventId);
    if (!eventData) {
        return {
            alreadyProcessed: true,
            notificationId: null,
            recipientId: null,
            internalType: null
        };
    }

    const payload = isRecord(eventData.payloadJson) ? eventData.payloadJson : {};
    const eventType = extractEventType(payload) ?? asNonEmptyString(eventData.eventType) ?? 'Unknown';
    const referenceIds = getReferenceIds(payload);
    const clinicianId = getRecipientClinicianId(referenceIds);

    try {
        const recipientId = await resolveRecipientId(clinicianId);
        const patientUid = await resolvePatientUid(referenceIds.patientId);
        const previousCounts = recipientId ? await getExistingCounts(recipientId) : {
            pendingPrescriptions: 0,
            transmissionErrors: 0,
            refillRequests: 0,
            changeRequests: 0,
            total: 0
        };
        const normalizedEvent = buildNormalizedEvent(payload, patientUid, previousCounts);

        const internalEventRef = admin.firestore().collection(INTERNAL_EVENTS_COLLECTION).doc(eventId);
        await internalEventRef.set({
            type: normalizedEvent.internalType,
            source: 'DOSESPOT',
            sourceEventType: eventType,
            priority: normalizedEvent.priority,
            status: 'SUCCESS',
            recipientId,
            patientUid,
            referenceIds: normalizedEvent.referenceIds,
            payload: normalizedEvent.payload,
            deepLink: normalizedEvent.notification?.href ?? buildDeepLink(eventType, patientUid),
            rawEventId: eventId,
            createdAt: eventData.createdAt ?? new Date(),
            updatedAt: new Date()
        }, { merge: true });

        if (recipientId && normalizedEvent.counts) {
            await upsertCountsDocument(recipientId, normalizedEvent.counts, clinicianId, eventId);
        }

        let summarySyncResult: Awaited<ReturnType<typeof syncDoseSpotPatientSummary>> | null = null;
        if (patientUid) {
            summarySyncResult = await syncDoseSpotPatientSummary({
                eventId,
                eventType,
                patientUid,
                referenceIds: {
                    patientId: normalizedEvent.referenceIds.patientId,
                    prescriptionId: normalizedEvent.referenceIds.prescriptionId,
                    priorAuthorizationCaseId: normalizedEvent.referenceIds.priorAuthorizationCaseId,
                    selfReportedMedicationId: normalizedEvent.referenceIds.selfReportedMedicationId,
                    pharmacyId: normalizedEvent.referenceIds.pharmacyId
                },
                payload
            });
        }

        if (recipientId && ['ClinicianConfirmed', 'ClinicianLockedOut', 'ClinicianIDPCompleteSuccess', 'ClinicianTfaActivateSuccess', 'ClinicianTfaDeactivateSuccess', 'ClinicianPINReset'].includes(eventType)) {
            await applyDoseSpotClinicianWebhookEvent(recipientId, eventType, payload);
        }

        let notificationId: string | null = null;
        let pushSent = false;
        if (recipientId && normalizedEvent.notification) {
            const notificationResult = await upsertNotification(eventId, recipientId, normalizedEvent.notification, normalizedEvent);
            notificationId = notificationResult.notificationId;
            pushSent = notificationResult.pushSent;
        }

        await admin.firestore().collection(WEBHOOK_EVENTS_COLLECTION).doc(eventId).set({
            eventType,
            processingStatus: 'SUCCESS',
            processedAt: new Date(),
            updatedAt: new Date(),
            errorMessage: null,
            recipientId,
            patientUid,
            internalType: normalizedEvent.internalType,
            notificationId,
            pushSentAt: pushSent ? new Date() : null,
            summarySync: summarySyncResult
        }, { merge: true });

        logger.info('[DoseSpot Webhook] Processed event successfully', {
            eventId,
            eventType,
            recipientId,
            internalType: normalizedEvent.internalType
        });

        return {
            alreadyProcessed: false,
            notificationId,
            recipientId,
            internalType: normalizedEvent.internalType
        };
    } catch (error) {
        await markWebhookEventFailed(eventId, error);
        logger.error('[DoseSpot Webhook] Processing failed', {
            eventId,
            eventType,
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}

export const doseSpotTestables = {
    buildNormalizedEvent,
    computeDedupeKey,
    getCounts
};
