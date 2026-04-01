import { ensureDoseSpotPatientForUid, type EnsureDoseSpotPatientResult } from './dosespot-patients';
import { doseSpotApiFetch, ensureDoseSpotResultOk, type DoseSpotResult } from './dosespot-rest';

export type DoseSpotWorkflowSyncStatus =
    | 'ready'
    | 'pending_retry'
    | 'ambiguous_match'
    | 'blocked';

export interface DoseSpotPageResult {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    hasPrevious: boolean;
    hasNext: boolean;
}

export interface DoseSpotMedicationHistoryView {
    patientUid: string;
    doseSpotPatientId: number | null;
    status: EnsureDoseSpotPatientResult['status'] | null;
    syncStatus: DoseSpotWorkflowSyncStatus;
    message: string;
    start: string | null;
    end: string | null;
    pageNumber: number;
    items: Record<string, unknown>[];
    pageResult: DoseSpotPageResult | null;
    result: DoseSpotResult | null;
    missingFields: string[];
    candidatePatientIds: number[];
}

export interface DoseSpotMedicationHistoryConsentView {
    patientUid: string;
    doseSpotPatientId: number | null;
    status: EnsureDoseSpotPatientResult['status'] | null;
    syncStatus: DoseSpotWorkflowSyncStatus;
    message: string;
    consentLoggedAt: string | null;
    result: DoseSpotResult | null;
    missingFields: string[];
    candidatePatientIds: number[];
}

export interface DoseSpotPrescriptionSummaryView {
    patientUid: string;
    doseSpotPatientId: number | null;
    status: EnsureDoseSpotPatientResult['status'] | null;
    syncStatus: DoseSpotWorkflowSyncStatus;
    message: string;
    startDate: string | null;
    endDate: string | null;
    pageNumber: number;
    statusClass: 'Active' | 'Inactive' | 'Pending' | null;
    prescriptionStatus: string | null;
    items: Record<string, unknown>[];
    pageResult: DoseSpotPageResult | null;
    result: DoseSpotResult | null;
    eligibility: {
        totalWithEligibilityId: number;
        totalWithoutEligibilityId: number;
        lastEligibilityId: number | null;
    };
    missingFields: string[];
    candidatePatientIds: number[];
}

export interface DoseSpotQueueView {
    patientUid: string | null;
    doseSpotPatientId: number | null;
    status: EnsureDoseSpotPatientResult['status'] | null;
    syncStatus: DoseSpotWorkflowSyncStatus;
    message: string;
    clinicId: 'Current' | 'All';
    pageNumber: number;
    items: Record<string, unknown>[];
    pageResult: DoseSpotPageResult | null;
    result: DoseSpotResult | null;
    totalItems: number;
    missingFields: string[];
    candidatePatientIds: number[];
}

interface DoseSpotPagedResponse {
    Items?: unknown[];
    PageResult?: unknown;
    Result?: DoseSpotResult;
}

interface DoseSpotItemResponse {
    Item?: unknown;
    Result?: DoseSpotResult;
}

function isMedicationHistoryConsentError(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized.includes('patient has not approved consent')
        || normalized.includes('history/consent');
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isDoseSpotAuthorizationConfigError(error: unknown): boolean {
    const message = toErrorMessage(error).toLowerCase();
    return (
        message.includes('configured operation group') ||
        message.includes('onbehalfofuser validation failed') ||
        message.includes('authorization has been denied')
    );
}

function buildWorkflowFailureMessage(
    operation: string,
    error: unknown
): { syncStatus: DoseSpotWorkflowSyncStatus; message: string } {
    if (isDoseSpotAuthorizationConfigError(error)) {
        return {
            syncStatus: 'blocked',
            message: `DoseSpot ${operation} operations are not enabled for the current staging credentials.`
        };
    }

    return {
        syncStatus: 'pending_retry',
        message: `DoseSpot ${operation} request failed. Retry after validating staging credentials and patient linkage.`
    };
}

interface ResolvePatientContextOptions {
    patientUid: string;
    onBehalfOfClinicianId?: number;
}

interface ResolvedPatientContext {
    patientUid: string;
    doseSpotPatientId: number | null;
    status: EnsureDoseSpotPatientResult['status'] | null;
    syncStatus: DoseSpotWorkflowSyncStatus;
    message: string;
    missingFields: string[];
    candidatePatientIds: number[];
}

interface HistoryOptions {
    start?: string;
    end?: string;
    pageNumber?: number;
    onBehalfOfClinicianId?: number;
}

interface PrescriptionSummaryOptions {
    startDate?: string;
    endDate?: string;
    pageNumber?: number;
    statusClass?: 'Active' | 'Inactive' | 'Pending';
    prescriptionStatus?: string;
    onBehalfOfClinicianId?: number;
}

interface QueueOptions {
    clinicId?: 'Current' | 'All';
    patientUid?: string;
    pageNumber?: number;
    onBehalfOfClinicianId?: number;
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

function toDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
}

function sanitizeDate(value: string | undefined, fallback: Date): string {
    const fromInput = asNonEmptyString(value);
    if (!fromInput) {
        return toDateOnly(fallback);
    }

    const directMatch = fromInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (directMatch) {
        return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
    }

    const parsed = new Date(fromInput);
    if (Number.isNaN(parsed.getTime())) {
        return toDateOnly(fallback);
    }

    return toDateOnly(parsed);
}

function normalizePageNumber(value: number | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.floor(value);
    }
    return 1;
}

function normalizeItems(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord);
}

function normalizePageResult(value: unknown): DoseSpotPageResult | null {
    if (!isRecord(value)) return null;

    return {
        currentPage: asNumber(value.CurrentPage ?? value.currentPage) ?? 1,
        totalPages: asNumber(value.TotalPages ?? value.totalPages) ?? 0,
        pageSize: asNumber(value.PageSize ?? value.pageSize) ?? 0,
        totalCount: asNumber(value.TotalCount ?? value.totalCount) ?? 0,
        hasPrevious: asBoolean(value.HasPrevious ?? value.hasPrevious) ?? false,
        hasNext: asBoolean(value.HasNext ?? value.hasNext) ?? false
    };
}

function normalizeClinicId(value: 'Current' | 'All' | undefined): 'Current' | 'All' {
    return value === 'All' ? 'All' : 'Current';
}

function defaultHistoryRange(): { start: string; end: string } {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 365);

    return {
        start: toDateOnly(start),
        end: toDateOnly(end)
    };
}

async function resolvePatientContext(
    options: ResolvePatientContextOptions
): Promise<ResolvedPatientContext> {
    const ensureResult = await ensureDoseSpotPatientForUid(options.patientUid, {
        updateExisting: false,
        onBehalfOfClinicianId: options.onBehalfOfClinicianId
    });

    return {
        patientUid: ensureResult.patientUid,
        doseSpotPatientId: ensureResult.doseSpotPatientId,
        status: ensureResult.status,
        syncStatus: ensureResult.syncStatus,
        message: ensureResult.message,
        missingFields: ensureResult.missingFields,
        candidatePatientIds: ensureResult.candidatePatientIds
    };
}

function buildEligibilitySummary(items: Record<string, unknown>[]): DoseSpotPrescriptionSummaryView['eligibility'] {
    let totalWithEligibilityId = 0;
    let totalWithoutEligibilityId = 0;
    let lastEligibilityId: number | null = null;

    for (const item of items) {
        const eligibilityId = asNumber(item.EligibilityId ?? item.eligibilityId);
        if (eligibilityId && eligibilityId > 0) {
            totalWithEligibilityId += 1;
            if (!lastEligibilityId) {
                lastEligibilityId = eligibilityId;
            }
        } else {
            totalWithoutEligibilityId += 1;
        }
    }

    return {
        totalWithEligibilityId,
        totalWithoutEligibilityId,
        lastEligibilityId
    };
}

export async function fetchDoseSpotMedicationHistoryForPatientUid(
    patientUid: string,
    options: HistoryOptions = {}
): Promise<DoseSpotMedicationHistoryView> {
    const patient = await resolvePatientContext({
        patientUid,
        onBehalfOfClinicianId: options.onBehalfOfClinicianId
    });
    const pageNumber = normalizePageNumber(options.pageNumber);
    const defaults = defaultHistoryRange();
    const start = sanitizeDate(options.start, new Date(`${defaults.start}T00:00:00.000Z`));
    const end = sanitizeDate(options.end, new Date(`${defaults.end}T00:00:00.000Z`));

    if (!patient.doseSpotPatientId || patient.syncStatus !== 'ready') {
        return {
            ...patient,
            start,
            end,
            pageNumber,
            items: [],
            pageResult: null,
            result: null
        };
    }

    const query = new URLSearchParams({
        start,
        end,
        pageNumber: String(pageNumber)
    });

    try {
        let response = await doseSpotApiFetch<DoseSpotPagedResponse>(
            `api/patients/${patient.doseSpotPatientId}/medications/history?${query.toString()}`,
            {
                method: 'GET',
                onBehalfOfClinicianId: options.onBehalfOfClinicianId
            }
        );

        try {
            ensureDoseSpotResultOk(response.Result, 'get medication history');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!isMedicationHistoryConsentError(message)) {
                throw error;
            }

            await doseSpotApiFetch<DoseSpotItemResponse>(
                `api/patients/${patient.doseSpotPatientId}/medications/history/consent`,
                {
                    method: 'POST',
                    body: {},
                    onBehalfOfClinicianId: options.onBehalfOfClinicianId
                }
            );

            response = await doseSpotApiFetch<DoseSpotPagedResponse>(
                `api/patients/${patient.doseSpotPatientId}/medications/history?${query.toString()}`,
                {
                    method: 'GET',
                    onBehalfOfClinicianId: options.onBehalfOfClinicianId
                }
            );
            ensureDoseSpotResultOk(response.Result, 'get medication history');
        }

        return {
            ...patient,
            message: 'Medication history retrieved successfully.',
            start,
            end,
            pageNumber,
            items: normalizeItems(response.Items),
            pageResult: normalizePageResult(response.PageResult),
            result: response.Result ?? null
        };
    } catch (error) {
        const failure = buildWorkflowFailureMessage('medication history', error);
        return {
            ...patient,
            syncStatus: failure.syncStatus,
            message: `${failure.message} (${toErrorMessage(error)})`,
            start,
            end,
            pageNumber,
            items: [],
            pageResult: null,
            result: null
        };
    }
}

export async function logDoseSpotMedicationHistoryConsentForPatientUid(
    patientUid: string,
    options: { onBehalfOfClinicianId?: number } = {}
): Promise<DoseSpotMedicationHistoryConsentView> {
    const patient = await resolvePatientContext({
        patientUid,
        onBehalfOfClinicianId: options.onBehalfOfClinicianId
    });

    if (!patient.doseSpotPatientId || patient.syncStatus !== 'ready') {
        return {
            ...patient,
            consentLoggedAt: null,
            result: null
        };
    }

    try {
        const response = await doseSpotApiFetch<DoseSpotItemResponse>(
            `api/patients/${patient.doseSpotPatientId}/medications/history/consent`,
            {
                method: 'POST',
                body: {},
                onBehalfOfClinicianId: options.onBehalfOfClinicianId
            }
        );
        ensureDoseSpotResultOk(response.Result, 'log medication history consent');

        const consentLoggedAt = asNonEmptyString(response.Item) ?? null;

        return {
            ...patient,
            message: consentLoggedAt
                ? `Medication history consent logged at ${consentLoggedAt}.`
                : 'Medication history consent logged.',
            consentLoggedAt,
            result: response.Result ?? null
        };
    } catch (error) {
        const failure = buildWorkflowFailureMessage('medication-history consent', error);
        return {
            ...patient,
            syncStatus: failure.syncStatus,
            message: `${failure.message} (${toErrorMessage(error)})`,
            consentLoggedAt: null,
            result: null
        };
    }
}

export async function fetchDoseSpotPrescriptionSummaryForPatientUid(
    patientUid: string,
    options: PrescriptionSummaryOptions = {}
): Promise<DoseSpotPrescriptionSummaryView> {
    const patient = await resolvePatientContext({
        patientUid,
        onBehalfOfClinicianId: options.onBehalfOfClinicianId
    });
    const pageNumber = normalizePageNumber(options.pageNumber);
    const defaults = defaultHistoryRange();
    const startDate = sanitizeDate(options.startDate, new Date(`${defaults.start}T00:00:00.000Z`));
    const endDate = sanitizeDate(options.endDate, new Date(`${defaults.end}T00:00:00.000Z`));
    const statusClass = options.statusClass ?? null;
    const prescriptionStatus = asNonEmptyString(options.prescriptionStatus);

    if (!patient.doseSpotPatientId || patient.syncStatus !== 'ready') {
        return {
            ...patient,
            startDate,
            endDate,
            pageNumber,
            statusClass,
            prescriptionStatus,
            items: [],
            pageResult: null,
            result: null,
            eligibility: {
                totalWithEligibilityId: 0,
                totalWithoutEligibilityId: 0,
                lastEligibilityId: null
            }
        };
    }

    const query = new URLSearchParams({
        startDate,
        endDate,
        pageNumber: String(pageNumber),
        sortColumn: 'DateWritten',
        sortOrder: 'Desc'
    });
    if (statusClass) {
        query.set('statusClass', statusClass);
    }
    if (prescriptionStatus) {
        query.set('prescriptionStatus', prescriptionStatus);
    }

    try {
        const response = await doseSpotApiFetch<DoseSpotPagedResponse>(
            `api/patients/${patient.doseSpotPatientId}/prescriptions?${query.toString()}`,
            {
                method: 'GET',
                onBehalfOfClinicianId: options.onBehalfOfClinicianId
            }
        );

        ensureDoseSpotResultOk(response.Result, 'get patient prescriptions');
        const items = normalizeItems(response.Items);

        return {
            ...patient,
            message: 'Prescription summary retrieved successfully.',
            startDate,
            endDate,
            pageNumber,
            statusClass,
            prescriptionStatus,
            items,
            pageResult: normalizePageResult(response.PageResult),
            result: response.Result ?? null,
            eligibility: buildEligibilitySummary(items)
        };
    } catch (error) {
        const failure = buildWorkflowFailureMessage('prescription summary', error);
        return {
            ...patient,
            syncStatus: failure.syncStatus,
            message: `${failure.message} (${toErrorMessage(error)})`,
            startDate,
            endDate,
            pageNumber,
            statusClass,
            prescriptionStatus,
            items: [],
            pageResult: null,
            result: null,
            eligibility: {
                totalWithEligibilityId: 0,
                totalWithoutEligibilityId: 0,
                lastEligibilityId: null
            }
        };
    }
}

async function resolveQueuePatientContext(
    patientUid: string | undefined,
    onBehalfOfClinicianId?: number
): Promise<ResolvedPatientContext | null> {
    if (!patientUid) return null;
    return resolvePatientContext({ patientUid, onBehalfOfClinicianId });
}

function buildQueueBlockedResult(
    context: ResolvedPatientContext,
    clinicId: 'Current' | 'All',
    pageNumber: number
): DoseSpotQueueView {
    return {
        patientUid: context.patientUid,
        doseSpotPatientId: context.doseSpotPatientId,
        status: context.status,
        syncStatus: context.syncStatus,
        message: context.message,
        clinicId,
        pageNumber,
        items: [],
        pageResult: null,
        result: null,
        totalItems: 0,
        missingFields: context.missingFields,
        candidatePatientIds: context.candidatePatientIds
    };
}

export async function fetchDoseSpotPendingRefillsQueue(
    options: QueueOptions = {}
): Promise<DoseSpotQueueView> {
    const clinicId = normalizeClinicId(options.clinicId);
    const pageNumber = normalizePageNumber(options.pageNumber);
    const patientContext = await resolveQueuePatientContext(options.patientUid, options.onBehalfOfClinicianId);

    if (patientContext && (!patientContext.doseSpotPatientId || patientContext.syncStatus !== 'ready')) {
        return buildQueueBlockedResult(patientContext, clinicId, pageNumber);
    }

    const query = new URLSearchParams({
        clinicId,
        pageNumber: String(pageNumber)
    });
    if (patientContext?.doseSpotPatientId) {
        query.set('patientId', String(patientContext.doseSpotPatientId));
    }

    try {
        const response = await doseSpotApiFetch<DoseSpotPagedResponse>(
            `api/refills/pending/detailed?${query.toString()}`,
            {
                method: 'GET',
                onBehalfOfClinicianId: options.onBehalfOfClinicianId
            }
        );
        ensureDoseSpotResultOk(response.Result, 'list pending refill requests');

        const items = normalizeItems(response.Items);
        const pageResult = normalizePageResult(response.PageResult);

        return {
            patientUid: patientContext?.patientUid ?? null,
            doseSpotPatientId: patientContext?.doseSpotPatientId ?? null,
            status: patientContext?.status ?? null,
            syncStatus: patientContext?.syncStatus ?? 'ready',
            message: 'Pending refill queue retrieved successfully.',
            clinicId,
            pageNumber,
            items,
            pageResult,
            result: response.Result ?? null,
            totalItems: pageResult?.totalCount ?? items.length,
            missingFields: patientContext?.missingFields ?? [],
            candidatePatientIds: patientContext?.candidatePatientIds ?? []
        };
    } catch (error) {
        const failure = buildWorkflowFailureMessage('refill queue', error);
        return {
            patientUid: patientContext?.patientUid ?? null,
            doseSpotPatientId: patientContext?.doseSpotPatientId ?? null,
            status: patientContext?.status ?? null,
            syncStatus: failure.syncStatus,
            message: `${failure.message} (${toErrorMessage(error)})`,
            clinicId,
            pageNumber,
            items: [],
            pageResult: null,
            result: null,
            totalItems: 0,
            missingFields: patientContext?.missingFields ?? [],
            candidatePatientIds: patientContext?.candidatePatientIds ?? []
        };
    }
}

export async function fetchDoseSpotPendingRxChangesQueue(
    options: QueueOptions = {}
): Promise<DoseSpotQueueView> {
    const clinicId = normalizeClinicId(options.clinicId);
    const pageNumber = normalizePageNumber(options.pageNumber);
    const patientContext = await resolveQueuePatientContext(options.patientUid, options.onBehalfOfClinicianId);

    if (patientContext && (!patientContext.doseSpotPatientId || patientContext.syncStatus !== 'ready')) {
        return buildQueueBlockedResult(patientContext, clinicId, pageNumber);
    }

    const query = new URLSearchParams({
        clinicId,
        pageNumber: String(pageNumber)
    });
    if (patientContext?.doseSpotPatientId) {
        query.set('patientId', String(patientContext.doseSpotPatientId));
    }

    try {
        const response = await doseSpotApiFetch<DoseSpotPagedResponse>(
            `api/rxchanges/pending/detailed?${query.toString()}`,
            {
                method: 'GET',
                onBehalfOfClinicianId: options.onBehalfOfClinicianId
            }
        );
        ensureDoseSpotResultOk(response.Result, 'list pending rxchange notifications');

        const items = normalizeItems(response.Items);
        const pageResult = normalizePageResult(response.PageResult);

        return {
            patientUid: patientContext?.patientUid ?? null,
            doseSpotPatientId: patientContext?.doseSpotPatientId ?? null,
            status: patientContext?.status ?? null,
            syncStatus: patientContext?.syncStatus ?? 'ready',
            message: 'Pending RxChange queue retrieved successfully.',
            clinicId,
            pageNumber,
            items,
            pageResult,
            result: response.Result ?? null,
            totalItems: pageResult?.totalCount ?? items.length,
            missingFields: patientContext?.missingFields ?? [],
            candidatePatientIds: patientContext?.candidatePatientIds ?? []
        };
    } catch (error) {
        const failure = buildWorkflowFailureMessage('RxChange queue', error);
        return {
            patientUid: patientContext?.patientUid ?? null,
            doseSpotPatientId: patientContext?.doseSpotPatientId ?? null,
            status: patientContext?.status ?? null,
            syncStatus: failure.syncStatus,
            message: `${failure.message} (${toErrorMessage(error)})`,
            clinicId,
            pageNumber,
            items: [],
            pageResult: null,
            result: null,
            totalItems: 0,
            missingFields: patientContext?.missingFields ?? [],
            candidatePatientIds: patientContext?.candidatePatientIds ?? []
        };
    }
}
