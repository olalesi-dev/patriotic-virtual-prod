import * as admin from 'firebase-admin';

interface DoseSpotReferenceIds {
    patientId: number | null;
    prescriptionId: number | null;
    priorAuthorizationCaseId: number | null;
    selfReportedMedicationId: number | null;
    pharmacyId: number | null;
}

export interface DoseSpotSummarySyncInput {
    eventId: string;
    eventType: string;
    patientUid: string;
    referenceIds: DoseSpotReferenceIds;
    payload: Record<string, unknown>;
}

export interface DoseSpotSummarySyncResult {
    orderIds: string[];
    medicationIds: string[];
    patientPatched: boolean;
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
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

function sanitizeText(value: string | null, maxLength: number): string | null {
    if (!value) return null;
    return value
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, maxLength) || null;
}

function getDataObject(payload: Record<string, unknown>): Record<string, unknown> {
    return isRecord(payload.Data) ? payload.Data : payload;
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = asNonEmptyString(source[key]);
        if (value) return value;
    }
    return null;
}

function toDateOnly(value: unknown): string | null {
    const parsed = asDate(value);
    if (parsed) {
        return parsed.toISOString().slice(0, 10);
    }
    const raw = asNonEmptyString(value);
    if (!raw) return null;
    const directMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (directMatch) {
        return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
    }
    return raw;
}

function eventDate(payload: Record<string, unknown>): string {
    const data = getDataObject(payload);
    return (
        toDateOnly(data.EventTime ?? payload.EventTime ?? data.CreatedAt ?? payload.CreatedAt ?? data.UpdatedAt ?? payload.UpdatedAt)
        ?? new Date().toISOString().slice(0, 10)
    );
}

function getMedicationStatusLabel(status: number | null): string {
    switch (status) {
        case 3:
            return 'Discontinued';
        case 4:
            return 'Deleted';
        case 5:
            return 'Completed';
        case 8:
            return 'Cancelled';
        case 9:
            return 'Cancel Denied';
        case 11:
            return 'Fully Filled';
        case 12:
            return 'Partially Filled';
        case 13:
            return 'Not Filled';
        default:
            return 'Updated';
    }
}

function getPrescriptionStatusLabel(data: Record<string, unknown>): string {
    const details = sanitizeText(asNonEmptyString(data.StatusDetails), 80)?.toLowerCase() ?? '';
    if (details.includes('error') || details.includes('fail') || details.includes('unable') || details.includes('reject') || details.includes('denied')) {
        return 'Transmission Error';
    }
    if (details.includes('filled')) return 'Filled';
    if (details.includes('sent') || details.includes('pharmacy')) return 'Sent';
    if (details.includes('pending') || details.includes('queued')) return 'In Progress';

    const status = asNumber(data.PrescriptionStatus);
    if (status === 13) return 'Transmission Error';
    return 'Sent';
}

function buildMedicationName(data: Record<string, unknown>, referenceIds: DoseSpotReferenceIds): string {
    return (
        sanitizeText(pickString(data, [
            'MedicationName',
            'MedicationDescription',
            'DrugName',
            'DisplayName',
            'CompoundDrugName',
            'Medication'
        ]), 160)
        ?? `DoseSpot medication #${referenceIds.selfReportedMedicationId ?? referenceIds.prescriptionId ?? 'update'}`
    );
}

function buildMedicationDocId(eventType: string, referenceIds: DoseSpotReferenceIds): string | null {
    const baseId = referenceIds.selfReportedMedicationId ?? referenceIds.prescriptionId;
    if (!baseId) return null;
    return `${eventType === 'SelfReportedMedicationStatusUpdate' ? 'dosespot-self' : 'dosespot-rx'}-${baseId}`;
}

function buildOrderDocId(prefix: string, remoteId: number | null, eventId: string): string {
    return remoteId ? `${prefix}-${remoteId}` : `${prefix}-${eventId}`;
}

async function upsertMedicationSummary(
    patientUid: string,
    docId: string,
    payload: Record<string, unknown>
): Promise<void> {
    const patientRef = admin.firestore().collection('patients').doc(patientUid);
    const docRef = patientRef.collection('medications').doc(docId);
    const snapshot = await docRef.get();
    const existingData = snapshot.exists ? (snapshot.data() as Record<string, unknown>) : {};
    const data = getDataObject(payload);
    const medicationStatus = asNumber(data.MedicationStatus);
    const startDate = toDateOnly(data.DateWritten ?? data.StartDate ?? data.LastUpdated ?? payload.EventTime);

    await docRef.set({
        name: buildMedicationName(data, {
            patientId: asNumber(data.PatientId) ?? null,
            prescriptionId: asNumber(data.PrescriptionId) ?? null,
            priorAuthorizationCaseId: null,
            selfReportedMedicationId: asNumber(data.SelfReportedMedicationId) ?? null,
            pharmacyId: null
        }),
        dosage: sanitizeText(pickString(data, ['Dosage', 'Strength', 'Quantity']), 80) ?? (asNonEmptyString(existingData.dosage) ?? 'DoseSpot-managed'),
        frequency: sanitizeText(pickString(data, ['Frequency', 'Directions', 'Sig']), 120) ?? (asNonEmptyString(existingData.frequency) ?? 'See DoseSpot'),
        route: sanitizeText(pickString(data, ['Route']), 40) ?? asNonEmptyString(existingData.route),
        status: getMedicationStatusLabel(medicationStatus),
        startDate: startDate ?? asNonEmptyString(existingData.startDate) ?? new Date().toISOString().slice(0, 10),
        provider: 'DoseSpot',
        source: 'dosespot',
        sourceEventType: asNonEmptyString(payload.EventType) ?? 'MedicationStatusUpdate',
        doseSpotPrescriptionId: asNumber(data.PrescriptionId),
        doseSpotMedicationId: asNumber(data.SelfReportedMedicationId),
        doseSpotPatientId: asNumber(data.PatientId),
        notes: sanitizeText(pickString(data, ['StatusNotes', 'StatusDetails']), 280),
        updatedAt: new Date(),
        createdAt: existingData.createdAt ?? new Date()
    }, { merge: true });
}

async function upsertOrderSummary(
    patientUid: string,
    docId: string,
    values: Record<string, unknown>
): Promise<void> {
    const patientRef = admin.firestore().collection('patients').doc(patientUid);
    const docRef = patientRef.collection('orders').doc(docId);
    const snapshot = await docRef.get();
    const existingData = snapshot.exists ? (snapshot.data() as Record<string, unknown>) : {};

    await docRef.set({
        ...values,
        updatedAt: new Date(),
        createdAt: existingData.createdAt ?? new Date()
    }, { merge: true });
}

async function patchPreferredPharmacy(
    patientUid: string,
    payload: Record<string, unknown>,
    referenceIds: DoseSpotReferenceIds
): Promise<boolean> {
    const data = getDataObject(payload);
    const pharmacyName = sanitizeText(pickString(data, ['PharmacyName', 'NewPharmacyName', 'Name']), 140);
    if (!pharmacyName && !referenceIds.pharmacyId) {
        return false;
    }

    const preferredPharmacy = pharmacyName ?? `DoseSpot pharmacy #${referenceIds.pharmacyId}`;
    const now = new Date();
    const patch: Record<string, unknown> = {
        preferredPharmacy,
        preferredPharmacyDoseSpotId: referenceIds.pharmacyId,
        'doseSpot.preferredPharmacyDoseSpotId': referenceIds.pharmacyId,
        'doseSpot.preferredPharmacySync.status': 'synced_from_webhook',
        'doseSpot.preferredPharmacySync.pharmacyId': referenceIds.pharmacyId,
        'doseSpot.preferredPharmacySync.lastSyncedAt': now,
        'doseSpot.preferredPharmacySync.lastError': null,
        updatedAt: now
    };

    await Promise.all([
        admin.firestore().collection('patients').doc(patientUid).set(patch, { merge: true }),
        admin.firestore().collection('users').doc(patientUid).set(patch, { merge: true })
    ]);

    return true;
}

export async function syncDoseSpotPatientSummary(input: DoseSpotSummarySyncInput): Promise<DoseSpotSummarySyncResult> {
    const result: DoseSpotSummarySyncResult = {
        orderIds: [],
        medicationIds: [],
        patientPatched: false
    };
    const data = getDataObject(input.payload);

    switch (input.eventType) {
        case 'PrescriptionResult': {
            const docId = buildOrderDocId('dosespot-rx', input.referenceIds.prescriptionId, input.eventId);
            await upsertOrderSummary(input.patientUid, docId, {
                type: 'erx',
                description: sanitizeText(
                    pickString(data, ['MedicationName', 'MedicationDescription', 'DrugName']),
                    160
                ) ?? `DoseSpot prescription #${input.referenceIds.prescriptionId ?? input.eventId}`,
                status: getPrescriptionStatusLabel(data),
                orderedAt: eventDate(input.payload),
                scheduledFor: null,
                provider: 'DoseSpot',
                orderedBy: 'DoseSpot',
                tests: [],
                notes: sanitizeText(pickString(data, ['StatusDetails']), 280),
                source: 'dosespot',
                sourceEventType: input.eventType,
                doseSpotPrescriptionId: input.referenceIds.prescriptionId,
                doseSpotPatientId: input.referenceIds.patientId
            });
            result.orderIds.push(docId);
            return result;
        }
        case 'PriorAuthorizationStatusUpdate': {
            const docId = buildOrderDocId('dosespot-pa', input.referenceIds.priorAuthorizationCaseId, input.eventId);
            await upsertOrderSummary(input.patientUid, docId, {
                type: 'prior_auth',
                description: `DoseSpot prior authorization #${input.referenceIds.priorAuthorizationCaseId ?? input.eventId}`,
                status: sanitizeText(pickString(data, ['PriorAuthorizationCaseStatus', 'Status']), 80) ?? 'Updated',
                orderedAt: eventDate(input.payload),
                scheduledFor: null,
                provider: 'DoseSpot',
                orderedBy: 'DoseSpot',
                tests: [],
                notes: sanitizeText(pickString(data, ['StatusDetails', 'AdditionalNotes']), 280),
                source: 'dosespot',
                sourceEventType: input.eventType,
                doseSpotPriorAuthorizationCaseId: input.referenceIds.priorAuthorizationCaseId,
                doseSpotPatientId: input.referenceIds.patientId
            });
            result.orderIds.push(docId);
            return result;
        }
        case 'MedicationStatusUpdate':
        case 'SelfReportedMedicationStatusUpdate': {
            const docId = buildMedicationDocId(input.eventType, input.referenceIds);
            if (!docId) return result;
            await upsertMedicationSummary(input.patientUid, docId, input.payload);
            result.medicationIds.push(docId);
            return result;
        }
        case 'PharmacyTransfer':
        case 'PharmacyStatusUpdate': {
            result.patientPatched = await patchPreferredPharmacy(input.patientUid, input.payload, input.referenceIds);
            return result;
        }
        default:
            return result;
    }
}
