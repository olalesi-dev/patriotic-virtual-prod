import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { doseSpotApiFetch, ensureDoseSpotResultOk, type DoseSpotResult } from './dosespot-rest';

export type DoseSpotEnsureStatus =
    | 'already_linked'
    | 'linked_existing'
    | 'created_new'
    | 'updated_existing'
    | 'pending_retry'
    | 'ambiguous_match'
    | 'blocked';

export type DoseSpotSyncState =
    | 'ready'
    | 'pending_retry'
    | 'ambiguous_match'
    | 'blocked';

export interface EnsureDoseSpotPatientResult {
    status: DoseSpotEnsureStatus;
    syncStatus: DoseSpotSyncState;
    patientUid: string;
    doseSpotPatientId: number | null;
    missingFields: string[];
    candidatePatientIds: number[];
    matchSource: string | null;
    message: string;
}

interface DoseSpotIdentifierResponse {
    Id?: number;
    Result?: DoseSpotResult;
}

interface DoseSpotPatientRecord {
    PatientId?: number | string;
    FirstName?: string;
    LastName?: string;
    DateOfBirth?: string;
    Gender?: string;
    Email?: string;
    Address1?: string;
    Address2?: string;
    City?: string;
    State?: string;
    ZipCode?: string;
    PrimaryPhone?: string;
    NonDoseSpotMedicalRecordNumber?: string;
    Active?: boolean;
}

interface DoseSpotSearchPatientsResponse {
    Items?: DoseSpotPatientRecord[];
    Result?: DoseSpotResult;
}

export interface DoseSpotAddEditPatientRequest {
    FirstName: string;
    LastName: string;
    DateOfBirth: string;
    Gender: 'Male' | 'Female' | 'Unknown';
    Email?: string;
    Address1: string;
    Address2?: string;
    City: string;
    State: string;
    ZipCode: string;
    PrimaryPhone: string;
    PrimaryPhoneType: 'Cell';
    NonDoseSpotMedicalRecordNumber: string;
    Active: boolean;
}

interface LocalPatientSource {
    patientUid: string;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    gender: 'Male' | 'Female' | 'Unknown';
    email: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    primaryPhone: string | null;
    mrn: string | null;
    existingDoseSpotPatientId: number | null;
    retryCount: number;
}

interface PersistSyncStateInput {
    patientUid: string;
    doseSpotPatientId: number | null;
    syncStatus: DoseSpotSyncState;
    matchSource: string | null;
    lastError: string | null;
    retryCount: number;
    candidatePatientIds: number[];
}

type PersistSyncStateHandler = (input: PersistSyncStateInput) => Promise<void>;

export interface EnsureDoseSpotPatientOptions {
    onBehalfOfClinicianId?: number;
    updateExisting?: boolean;
}

interface DoseSpotPatientGateway {
    searchPatients(
        params: {
            firstName: string;
            lastName: string;
            dateOfBirth: string;
        },
        onBehalfOfClinicianId?: number
    ): Promise<DoseSpotPatientRecord[]>;
    addPatient(
        payload: DoseSpotAddEditPatientRequest,
        onBehalfOfClinicianId?: number
    ): Promise<number>;
    editPatient(
        patientId: number,
        payload: DoseSpotAddEditPatientRequest,
        onBehalfOfClinicianId?: number
    ): Promise<number>;
    getPatient(
        patientId: number,
        onBehalfOfClinicianId?: number
    ): Promise<DoseSpotPatientRecord | null>;
    addPatientPharmacy(
        patientId: number,
        payload: { pharmacyId: number; setAsPrimary: boolean },
        onBehalfOfClinicianId?: number
    ): Promise<void>;
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isDoseSpotOperationGroupError(error: unknown): boolean {
    const message = toErrorMessage(error).toLowerCase();
    return message.includes('configured operation group');
}

function isDoseSpotAuthorizationConfigError(error: unknown): boolean {
    const message = toErrorMessage(error).toLowerCase();
    return (
        isDoseSpotOperationGroupError(error) ||
        message.includes('onbehalfofuser validation failed') ||
        message.includes('authorization has been denied')
    );
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function normalizePhone(value: string | null): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
        return digits.slice(1);
    }
    return digits.length >= 10 ? digits.slice(0, 10) : null;
}

function normalizeZip(value: string | null): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    return digits.length >= 5 ? digits.slice(0, 5) : null;
}

function normalizeGender(value: unknown): 'Male' | 'Female' | 'Unknown' {
    if (typeof value !== 'string') return 'Unknown';
    const normalized = value.trim().toLowerCase();
    if (normalized === 'male' || normalized === 'm') return 'Male';
    if (normalized === 'female' || normalized === 'f') return 'Female';
    return 'Unknown';
}

function formatDateOnly(value: string | null): string | null {
    if (!value) return null;
    const directMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (directMatch) {
        return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

function toDoseSpotDateTime(value: string): string {
    return `${value}T00:00:00.000Z`;
}

function namesFromDisplayName(value: string | null): { firstName: string | null; lastName: string | null } {
    if (!value) return { firstName: null, lastName: null };
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: null, lastName: null };
    return {
        firstName: parts[0] ?? null,
        lastName: parts.slice(1).join(' ') || null
    };
}

function pickPatientName(data: Record<string, unknown>): { firstName: string | null; lastName: string | null } {
    const directFirst = asNonEmptyString(data.firstName);
    const directLast = asNonEmptyString(data.lastName);
    if (directFirst || directLast) {
        return {
            firstName: directFirst,
            lastName: directLast
        };
    }

    return namesFromDisplayName(
        asNonEmptyString(data.name) ??
        asNonEmptyString(data.displayName)
    );
}

function extractExistingDoseSpotPatientId(data: Record<string, unknown>): number | null {
    return (
        asNumber(data.doseSpotPatientId) ??
        asNumber((data.doseSpot as Record<string, unknown> | undefined)?.patientId) ??
        null
    );
}

function readRetryCount(data: Record<string, unknown>): number {
    return asNumber((data.doseSpot as Record<string, unknown> | undefined)?.retryCount) ?? 0;
}

function recommendedMissingFields(source: LocalPatientSource): string[] {
    return [
        source.address1 ? null : 'address1',
        source.city ? null : 'city',
        source.state ? null : 'state',
        source.zipCode ? null : 'zipCode',
        source.primaryPhone ? null : 'primaryPhone'
    ].filter((value): value is string => Boolean(value));
}

function blockingMissingFields(source: LocalPatientSource): string[] {
    return [
        source.firstName ? null : 'firstName',
        source.lastName ? null : 'lastName',
        source.dateOfBirth ? null : 'dateOfBirth'
    ].filter((value): value is string => Boolean(value));
}

function writeBlockingMissingFields(source: LocalPatientSource): string[] {
    return [
        ...blockingMissingFields(source),
        ...recommendedMissingFields(source)
    ];
}

function buildDoseSpotPayload(source: LocalPatientSource): DoseSpotAddEditPatientRequest {
    const missingFields = writeBlockingMissingFields(source);
    if (missingFields.length > 0) {
        throw new Error(`DoseSpot patient payload requires ${missingFields.join(', ')}.`);
    }

    const payload: DoseSpotAddEditPatientRequest = {
        FirstName: source.firstName!,
        LastName: source.lastName!,
        DateOfBirth: toDoseSpotDateTime(source.dateOfBirth!),
        Gender: source.gender,
        Address1: source.address1!,
        City: source.city!,
        State: source.state!,
        ZipCode: source.zipCode!,
        PrimaryPhone: source.primaryPhone!,
        PrimaryPhoneType: 'Cell',
        NonDoseSpotMedicalRecordNumber: source.mrn ?? source.patientUid,
        Active: true
    };

    if (source.email) payload.Email = source.email;
    if (source.address2) payload.Address2 = source.address2;

    return payload;
}

function pickPatientRecordId(record: DoseSpotPatientRecord): number | null {
    return asNumber(record.PatientId);
}

function recordsMatchExactly(record: DoseSpotPatientRecord, source: LocalPatientSource): boolean {
    const recordFirstName = asNonEmptyString(record.FirstName)?.toLowerCase();
    const recordLastName = asNonEmptyString(record.LastName)?.toLowerCase();
    const recordDob = formatDateOnly(record.DateOfBirth ?? null);

    return (
        recordFirstName === source.firstName?.toLowerCase() &&
        recordLastName === source.lastName?.toLowerCase() &&
        recordDob === source.dateOfBirth
    );
}

function recordMatchesContact(record: DoseSpotPatientRecord, source: LocalPatientSource): boolean {
    const sourceZip = normalizeZip(source.zipCode);
    const sourcePhone = normalizePhone(source.primaryPhone);
    const recordZip = normalizeZip(asNonEmptyString(record.ZipCode));
    const recordPhone = normalizePhone(asNonEmptyString(record.PrimaryPhone));

    return (
        (Boolean(sourceZip) && sourceZip === recordZip) ||
        (Boolean(sourcePhone) && sourcePhone === recordPhone)
    );
}

function chooseSearchMatch(records: DoseSpotPatientRecord[], source: LocalPatientSource): {
    chosenPatientId: number | null;
    candidatePatientIds: number[];
    matchSource: string | null;
    ambiguous: boolean;
} {
    const exactMatches = records.filter((record) => recordsMatchExactly(record, source));
    const exactIds = exactMatches
        .map((record) => pickPatientRecordId(record))
        .filter((value): value is number => value !== null);

    if (exactMatches.length === 1 && exactIds.length === 1) {
        return {
            chosenPatientId: exactIds[0],
            candidatePatientIds: exactIds,
            matchSource: 'search_exact',
            ambiguous: false
        };
    }

    if (exactMatches.length > 1) {
        const narrowed = exactMatches.filter((record) => recordMatchesContact(record, source));
        const narrowedIds = narrowed
            .map((record) => pickPatientRecordId(record))
            .filter((value): value is number => value !== null);

        if (narrowed.length === 1 && narrowedIds.length === 1) {
            return {
                chosenPatientId: narrowedIds[0],
                candidatePatientIds: exactIds,
                matchSource: 'search_contact',
                ambiguous: false
            };
        }

        return {
            chosenPatientId: null,
            candidatePatientIds: exactIds,
            matchSource: null,
            ambiguous: true
        };
    }

    return {
        chosenPatientId: null,
        candidatePatientIds: [],
        matchSource: null,
        ambiguous: false
    };
}

const defaultGateway: DoseSpotPatientGateway = {
    async searchPatients(params, onBehalfOfClinicianId) {
        const query = new URLSearchParams({
            firstname: params.firstName,
            lastname: params.lastName,
            dob: params.dateOfBirth,
            pageNumber: '1',
            patientStatus: '2'
        });

        const response = await doseSpotApiFetch<DoseSpotSearchPatientsResponse>(
            `api/patients/search?${query.toString()}`,
            { method: 'GET', onBehalfOfClinicianId }
        );

        return Array.isArray(response.Items) ? response.Items : [];
    },

    async addPatient(payload, onBehalfOfClinicianId) {
        const response = await doseSpotApiFetch<DoseSpotIdentifierResponse>('api/patients', {
            method: 'POST',
            body: payload,
            onBehalfOfClinicianId
        });
        ensureDoseSpotResultOk(response.Result, 'add patient');

        const id = asNumber(response.Id);
        if (!id) {
            throw new Error('DoseSpot add patient response did not include an Id.');
        }

        return id;
    },

    async editPatient(patientId, payload, onBehalfOfClinicianId) {
        const response = await doseSpotApiFetch<DoseSpotIdentifierResponse>(`api/patients/${patientId}`, {
            method: 'PUT',
            body: payload,
            onBehalfOfClinicianId
        });
        ensureDoseSpotResultOk(response.Result, 'edit patient');

        return asNumber(response.Id) ?? patientId;
    },

    async getPatient(patientId, onBehalfOfClinicianId) {
        const response = await doseSpotApiFetch<{ Item?: DoseSpotPatientRecord }>(`api/patients/${patientId}`, {
            method: 'GET',
            onBehalfOfClinicianId
        });

        return response.Item ?? null;
    },

    async addPatientPharmacy(patientId, payload, onBehalfOfClinicianId) {
        await doseSpotApiFetch<{ Result?: DoseSpotResult }>(`api/patients/${patientId}/pharmacies`, {
            method: 'POST',
            body: {
                PharmacyId: payload.pharmacyId,
                SetAsPrimary: payload.setAsPrimary
            },
            onBehalfOfClinicianId
        });
    }
};

async function loadLocalPatientSource(patientUid: string): Promise<LocalPatientSource | null> {
    const firestore = admin.firestore();
    const [patientDoc, userDoc] = await Promise.all([
        firestore.collection('patients').doc(patientUid).get(),
        firestore.collection('users').doc(patientUid).get()
    ]);

    if (!patientDoc.exists && !userDoc.exists) {
        return null;
    }

    const merged = {
        ...(userDoc.exists ? userDoc.data() : {}),
        ...(patientDoc.exists ? patientDoc.data() : {})
    } as Record<string, unknown>;
    const patientName = pickPatientName(merged);
    const formattedDob = formatDateOnly(
        asNonEmptyString(merged.dateOfBirth) ??
        asNonEmptyString(merged.dob)
    );

    return {
        patientUid,
        firstName: patientName.firstName,
        lastName: patientName.lastName,
        dateOfBirth: formattedDob,
        gender: normalizeGender(merged.sexAtBirth ?? merged.sex ?? merged.gender),
        email: asNonEmptyString(merged.email),
        address1: asNonEmptyString(merged.address1) ?? asNonEmptyString(merged.address),
        address2: asNonEmptyString(merged.address2),
        city: asNonEmptyString(merged.city),
        state: asNonEmptyString(merged.state),
        zipCode: normalizeZip(asNonEmptyString(merged.zipCode) ?? asNonEmptyString(merged.zip)),
        primaryPhone: normalizePhone(asNonEmptyString(merged.phone) ?? asNonEmptyString(merged.phoneNumber)),
        mrn: asNonEmptyString(merged.mrn),
        existingDoseSpotPatientId: extractExistingDoseSpotPatientId(merged),
        retryCount: readRetryCount(merged)
    };
}

async function persistSyncState(input: PersistSyncStateInput): Promise<void> {
    const now = new Date();
    const patientPayload: Record<string, unknown> = {
        doseSpotPatientId: input.doseSpotPatientId,
        'doseSpot.syncStatus': input.syncStatus,
        'doseSpot.matchSource': input.matchSource,
        'doseSpot.lastError': input.lastError,
        'doseSpot.retryCount': input.retryCount,
        'doseSpot.candidatePatientIds': input.candidatePatientIds,
        ...(input.syncStatus === 'ready' ? { 'doseSpot.lastSyncedAt': now } : {}),
        updatedAt: now
    };

    const userPayload: Record<string, unknown> = {
        doseSpotPatientId: input.doseSpotPatientId,
        'doseSpot.syncStatus': input.syncStatus,
        ...(input.syncStatus === 'ready' ? { 'doseSpot.lastSyncedAt': now } : {}),
        updatedAt: now
    };

    await Promise.all([
        admin.firestore().collection('patients').doc(input.patientUid).set(patientPayload, { merge: true }),
        admin.firestore().collection('users').doc(input.patientUid).set(userPayload, { merge: true })
    ]);
}

function buildReadyResult(
    source: LocalPatientSource,
    status: Extract<DoseSpotEnsureStatus, 'already_linked' | 'linked_existing' | 'created_new' | 'updated_existing'>,
    doseSpotPatientId: number,
    matchSource: string
): EnsureDoseSpotPatientResult {
    return {
        status,
        syncStatus: 'ready',
        patientUid: source.patientUid,
        doseSpotPatientId,
        missingFields: recommendedMissingFields(source),
        candidatePatientIds: status === 'linked_existing' ? [doseSpotPatientId] : [],
        matchSource,
        message: status === 'created_new'
            ? 'Created a new DoseSpot patient and linked it to the local record.'
            : status === 'updated_existing'
                ? 'Updated the linked DoseSpot patient record.'
                : status === 'linked_existing'
                    ? 'Linked the existing DoseSpot patient to the local record.'
                    : 'Using the linked DoseSpot patient record.'
    };
}

async function finalizeResult(
    source: LocalPatientSource,
    result: EnsureDoseSpotPatientResult,
    lastError: string | null = null,
    persistHandler: PersistSyncStateHandler = persistSyncState
): Promise<EnsureDoseSpotPatientResult> {
    const nextRetryCount = result.syncStatus === 'pending_retry'
        ? source.retryCount + 1
        : (result.syncStatus === 'ready' ? 0 : source.retryCount);

    await persistHandler({
        patientUid: source.patientUid,
        doseSpotPatientId: result.doseSpotPatientId,
        syncStatus: result.syncStatus,
        matchSource: result.matchSource,
        lastError,
        retryCount: nextRetryCount,
        candidatePatientIds: result.candidatePatientIds
    });

    return result;
}

async function ensureDoseSpotPatientWithSource(
    source: LocalPatientSource,
    options: EnsureDoseSpotPatientOptions = {},
    gateway: DoseSpotPatientGateway = defaultGateway,
    persistHandler: PersistSyncStateHandler = persistSyncState
): Promise<EnsureDoseSpotPatientResult> {
    if (source.existingDoseSpotPatientId) {
        if (options.updateExisting) {
            const blockingFields = writeBlockingMissingFields(source);
            if (blockingFields.length > 0) {
                return finalizeResult(source, {
                    status: 'already_linked',
                    syncStatus: 'ready',
                    patientUid: source.patientUid,
                    doseSpotPatientId: source.existingDoseSpotPatientId,
                    missingFields: blockingFields,
                    candidatePatientIds: [],
                    matchSource: 'existing_link',
                    message: 'Using the linked DoseSpot patient record. Add missing demographics before attempting a sync update.'
                }, null, persistHandler);
            }

            const payload = buildDoseSpotPayload(source);
            try {
                const updatedId = await gateway.editPatient(
                    source.existingDoseSpotPatientId,
                    payload,
                    options.onBehalfOfClinicianId
                );

                return finalizeResult(
                    source,
                    buildReadyResult(source, 'updated_existing', updatedId, 'updated_existing'),
                    null,
                    persistHandler
                );
            } catch (error) {
                const message = toErrorMessage(error) || 'DoseSpot patient update failed.';
                logger.warn('[DoseSpot Patient Sync] Linked patient update failed', {
                    patientUid: source.patientUid,
                    doseSpotPatientId: source.existingDoseSpotPatientId,
                    error: message
                });

                if (isDoseSpotAuthorizationConfigError(error)) {
                    return finalizeResult(
                        source,
                        {
                            status: 'blocked',
                            syncStatus: 'blocked',
                            patientUid: source.patientUid,
                            doseSpotPatientId: source.existingDoseSpotPatientId,
                            missingFields: [],
                            candidatePatientIds: [],
                            matchSource: 'existing_link',
                            message: 'DoseSpot REST patient operations are not enabled for the current staging credentials. Contact DoseSpot to enable the JumpStart patient-management operation group.'
                        },
                        message,
                        persistHandler
                    );
                }

                return finalizeResult(
                    source,
                    {
                        status: 'pending_retry',
                        syncStatus: 'pending_retry',
                        patientUid: source.patientUid,
                        doseSpotPatientId: source.existingDoseSpotPatientId,
                        missingFields: recommendedMissingFields(source),
                        candidatePatientIds: [],
                        matchSource: 'existing_link',
                        message: 'DoseSpot patient is linked, but demographic sync failed and should be retried.'
                    },
                    message,
                    persistHandler
                );
            }
        }

        return finalizeResult(
            source,
            buildReadyResult(
                source,
                'already_linked',
                source.existingDoseSpotPatientId,
                'existing_link'
            ),
            null,
            persistHandler
        );
    }

    const blockingFields = blockingMissingFields(source);
    if (blockingFields.length > 0) {
        return finalizeResult(source, {
            status: 'blocked',
            syncStatus: 'blocked',
            patientUid: source.patientUid,
            doseSpotPatientId: null,
            missingFields: blockingFields,
            candidatePatientIds: [],
            matchSource: null,
            message: 'DoseSpot sync requires first name, last name, and date of birth.'
        }, null, persistHandler);
    }

    try {
        const searchResults = await gateway.searchPatients({
            firstName: source.firstName!,
            lastName: source.lastName!,
            dateOfBirth: source.dateOfBirth!
        }, options.onBehalfOfClinicianId);

        const match = chooseSearchMatch(searchResults, source);
        if (match.chosenPatientId) {
            return finalizeResult(
                source,
                {
                    ...buildReadyResult(source, 'linked_existing', match.chosenPatientId, match.matchSource ?? 'search_exact'),
                    candidatePatientIds: match.candidatePatientIds
                },
                null,
                persistHandler
            );
        }

        if (match.ambiguous) {
            return finalizeResult(source, {
                status: 'ambiguous_match',
                syncStatus: 'ambiguous_match',
                patientUid: source.patientUid,
                doseSpotPatientId: null,
                missingFields: recommendedMissingFields(source),
                candidatePatientIds: match.candidatePatientIds,
                matchSource: null,
                message: 'Multiple DoseSpot patient matches were found. Review the patient record before linking.'
            }, null, persistHandler);
        }
    } catch (error) {
        const message = toErrorMessage(error) || 'DoseSpot patient search failed.';
        logger.warn('[DoseSpot Patient Sync] Search failed', {
            patientUid: source.patientUid,
            error: message
        });

        if (isDoseSpotAuthorizationConfigError(error)) {
            return finalizeResult(
                source,
                {
                    status: 'blocked',
                    syncStatus: 'blocked',
                    patientUid: source.patientUid,
                    doseSpotPatientId: null,
                    missingFields: [],
                    candidatePatientIds: [],
                    matchSource: null,
                    message: 'DoseSpot REST patient operations are not enabled for the current staging credentials. Contact DoseSpot to enable the JumpStart patient-management operation group.'
                },
                message,
                persistHandler
            );
        }

        return finalizeResult(
            source,
            {
                status: 'pending_retry',
                syncStatus: 'pending_retry',
                patientUid: source.patientUid,
                doseSpotPatientId: null,
                missingFields: recommendedMissingFields(source),
                candidatePatientIds: [],
                matchSource: null,
                message: 'DoseSpot patient search failed. Retry on the next sync attempt.'
            },
            message,
            persistHandler
        );
    }

    const createBlockingFields = recommendedMissingFields(source);
    if (createBlockingFields.length > 0) {
        return finalizeResult(source, {
            status: 'blocked',
            syncStatus: 'blocked',
            patientUid: source.patientUid,
            doseSpotPatientId: null,
            missingFields: createBlockingFields,
            candidatePatientIds: [],
            matchSource: null,
            message: 'DoseSpot patient creation requires address1, city, state, zipCode, and primaryPhone.'
        }, null, persistHandler);
    }

    const payload = buildDoseSpotPayload(source);

    try {
        const createdPatientId = await gateway.addPatient(payload, options.onBehalfOfClinicianId);
        return finalizeResult(
            source,
            buildReadyResult(source, 'created_new', createdPatientId, 'created'),
            null,
            persistHandler
        );
    } catch (error) {
        const message = toErrorMessage(error) || 'DoseSpot patient creation failed.';
        logger.warn('[DoseSpot Patient Sync] Create failed', {
            patientUid: source.patientUid,
            error: message
        });

        if (isDoseSpotAuthorizationConfigError(error)) {
            return finalizeResult(
                source,
                {
                    status: 'blocked',
                    syncStatus: 'blocked',
                    patientUid: source.patientUid,
                    doseSpotPatientId: null,
                    missingFields: [],
                    candidatePatientIds: [],
                    matchSource: null,
                    message: 'DoseSpot REST patient operations are not enabled for the current staging credentials. Contact DoseSpot to enable the JumpStart patient-management operation group.'
                },
                message,
                persistHandler
            );
        }

        return finalizeResult(
            source,
            {
                status: 'pending_retry',
                syncStatus: 'pending_retry',
                patientUid: source.patientUid,
                doseSpotPatientId: null,
                missingFields: recommendedMissingFields(source),
                candidatePatientIds: [],
                matchSource: null,
                message: 'DoseSpot patient creation failed. Retry on the next sync attempt.'
            },
            message,
            persistHandler
        );
    }
}

export async function ensureDoseSpotPatientForUid(
    patientUid: string,
    options: EnsureDoseSpotPatientOptions = {},
    gateway: DoseSpotPatientGateway = defaultGateway
): Promise<EnsureDoseSpotPatientResult> {
    const source = await loadLocalPatientSource(patientUid);
    if (!source) {
        return {
            status: 'blocked',
            syncStatus: 'blocked',
            patientUid,
            doseSpotPatientId: null,
            missingFields: ['patientRecord'],
            candidatePatientIds: [],
            matchSource: null,
            message: 'Local patient record was not found.'
        };
    }

    return ensureDoseSpotPatientWithSource(source, options, gateway);
}

function normalizeMatchCandidates(records: DoseSpotPatientRecord[], source: LocalPatientSource): number[] {
    return chooseSearchMatch(records, source).candidatePatientIds;
}

export const doseSpotPatientTestables = {
    blockingMissingFields,
    buildDoseSpotPayload,
    chooseSearchMatch,
    ensureDoseSpotPatientWithSource,
    formatDateOnly,
    normalizeGender,
    normalizeMatchCandidates,
    normalizePhone,
    normalizeZip,
    recommendedMissingFields,
    writeBlockingMissingFields,
    recordsMatchExactly,
    recordMatchesContact
};
