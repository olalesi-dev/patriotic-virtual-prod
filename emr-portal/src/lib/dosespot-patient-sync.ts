import type { User as FirebaseUser } from 'firebase/auth';
import { apiFetchJson } from '@/lib/api-client';
import { getDoseSpotApiUrl } from '@/lib/dosespot-client';

export type DoseSpotPatientEnsureStatus =
    | 'already_linked'
    | 'linked_existing'
    | 'created_new'
    | 'updated_existing'
    | 'pending_retry'
    | 'ambiguous_match'
    | 'blocked';

export type DoseSpotSyncStatus =
    | 'ready'
    | 'pending_retry'
    | 'ambiguous_match'
    | 'blocked';

export interface DoseSpotPatientEnsureResponse {
    status: DoseSpotPatientEnsureStatus;
    syncStatus: DoseSpotSyncStatus;
    patientUid: string;
    doseSpotPatientId: number | null;
    missingFields: string[];
    candidatePatientIds: number[];
    matchSource: string | null;
    message: string;
}

export interface DoseSpotSsoUrlResponse {
    status: DoseSpotPatientEnsureStatus | 'ready';
    syncStatus: DoseSpotSyncStatus;
    patientUid: string | null;
    doseSpotPatientId: number | null;
    missingFields: string[];
    candidatePatientIds: number[];
    matchSource: string | null;
    message: string;
    ssoUrl?: string;
}

interface EnsureDoseSpotPatientInput {
    patientUid?: string;
    updateExisting?: boolean;
}

export async function ensureDoseSpotPatientLink(
    user: FirebaseUser,
    input: EnsureDoseSpotPatientInput = {}
): Promise<DoseSpotPatientEnsureResponse> {
    return apiFetchJson<DoseSpotPatientEnsureResponse>(
        getDoseSpotApiUrl('/api/v1/dosespot/patients/ensure'),
        {
            method: 'POST',
            user,
            body: input
        }
    );
}

export async function syncDoseSpotPatientBestEffort(
    user: FirebaseUser,
    input: EnsureDoseSpotPatientInput = {}
): Promise<DoseSpotPatientEnsureResponse | null> {
    try {
        return await ensureDoseSpotPatientLink(user, input);
    } catch (error) {
        console.warn('DoseSpot patient sync failed during best-effort attempt.', error);
        return null;
    }
}
