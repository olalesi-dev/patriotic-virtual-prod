import type { User as FirebaseUser } from 'firebase/auth';
import { apiFetchJson } from '@/lib/api-client';
import { getDoseSpotApiUrl } from '@/lib/dosespot-client';

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

export interface DoseSpotResult {
    ResultCode?: string;
    ResultDescription?: string;
}

interface DoseSpotWorkflowBase {
    patientUid: string | null;
    doseSpotPatientId: number | null;
    status: string | null;
    syncStatus: DoseSpotWorkflowSyncStatus;
    message: string;
    missingFields: string[];
    candidatePatientIds: number[];
}

export interface DoseSpotMedicationHistoryView extends DoseSpotWorkflowBase {
    patientUid: string;
    start: string | null;
    end: string | null;
    pageNumber: number;
    items: Record<string, unknown>[];
    pageResult: DoseSpotPageResult | null;
    result: DoseSpotResult | null;
}

export interface DoseSpotMedicationHistoryConsentView extends DoseSpotWorkflowBase {
    patientUid: string;
    consentLoggedAt: string | null;
    result: DoseSpotResult | null;
}

export interface DoseSpotPrescriptionSummaryView extends DoseSpotWorkflowBase {
    patientUid: string;
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
}

export interface DoseSpotQueueView extends DoseSpotWorkflowBase {
    clinicId: 'Current' | 'All';
    pageNumber: number;
    items: Record<string, unknown>[];
    pageResult: DoseSpotPageResult | null;
    result: DoseSpotResult | null;
    totalItems: number;
}

function appendQuery(path: string, query: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value && value.trim().length > 0) {
            params.set(key, value);
        }
    }
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
}

export async function fetchDoseSpotMedicationHistory(
    user: FirebaseUser,
    patientUid: string,
    query: {
        start?: string;
        end?: string;
        pageNumber?: number;
    } = {}
): Promise<DoseSpotMedicationHistoryView> {
    const path = appendQuery(`/api/v1/dosespot/patients/${encodeURIComponent(patientUid)}/medication-history`, {
        start: query.start,
        end: query.end,
        pageNumber: typeof query.pageNumber === 'number' ? String(query.pageNumber) : undefined
    });

    return apiFetchJson<DoseSpotMedicationHistoryView>(getDoseSpotApiUrl(path), {
        method: 'GET',
        user
    });
}

export async function logDoseSpotMedicationHistoryConsent(
    user: FirebaseUser,
    patientUid: string
): Promise<DoseSpotMedicationHistoryConsentView> {
    return apiFetchJson<DoseSpotMedicationHistoryConsentView>(
        getDoseSpotApiUrl(`/api/v1/dosespot/patients/${encodeURIComponent(patientUid)}/medication-history/consent`),
        {
            method: 'POST',
            user
        }
    );
}

export async function fetchDoseSpotPrescriptionSummary(
    user: FirebaseUser,
    patientUid: string,
    query: {
        startDate?: string;
        endDate?: string;
        pageNumber?: number;
        statusClass?: 'Active' | 'Inactive' | 'Pending';
        prescriptionStatus?: string;
    } = {}
): Promise<DoseSpotPrescriptionSummaryView> {
    const path = appendQuery(`/api/v1/dosespot/patients/${encodeURIComponent(patientUid)}/prescriptions`, {
        startDate: query.startDate,
        endDate: query.endDate,
        pageNumber: typeof query.pageNumber === 'number' ? String(query.pageNumber) : undefined,
        statusClass: query.statusClass,
        prescriptionStatus: query.prescriptionStatus
    });

    return apiFetchJson<DoseSpotPrescriptionSummaryView>(getDoseSpotApiUrl(path), {
        method: 'GET',
        user
    });
}

export async function fetchDoseSpotRefillQueue(
    user: FirebaseUser,
    query: {
        patientUid?: string;
        clinicId?: 'Current' | 'All';
        pageNumber?: number;
    } = {}
): Promise<DoseSpotQueueView> {
    const path = appendQuery('/api/v1/dosespot/queues/refills', {
        patientUid: query.patientUid,
        clinicId: query.clinicId,
        pageNumber: typeof query.pageNumber === 'number' ? String(query.pageNumber) : undefined
    });

    return apiFetchJson<DoseSpotQueueView>(getDoseSpotApiUrl(path), {
        method: 'GET',
        user
    });
}

export async function fetchDoseSpotRxChangeQueue(
    user: FirebaseUser,
    query: {
        patientUid?: string;
        clinicId?: 'Current' | 'All';
        pageNumber?: number;
    } = {}
): Promise<DoseSpotQueueView> {
    const path = appendQuery('/api/v1/dosespot/queues/rxchanges', {
        patientUid: query.patientUid,
        clinicId: query.clinicId,
        pageNumber: typeof query.pageNumber === 'number' ? String(query.pageNumber) : undefined
    });

    return apiFetchJson<DoseSpotQueueView>(getDoseSpotApiUrl(path), {
        method: 'GET',
        user
    });
}
