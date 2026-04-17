import type { User as FirebaseUser } from 'firebase/auth';
import { apiFetchJson } from '@/lib/api-client';
import { getDoseSpotApiUrl } from '@/lib/dosespot-client';

export interface DoseSpotClinicianSyncResponse {
    clinicianUid: string;
    clinicianId: number | null;
    synced: boolean;
    registrationStatus: string | null;
    missingFields: string[];
    message: string;
    rawResponse?: Record<string, unknown> | unknown[];
}

export interface DoseSpotClinicianRegistrationStatusResponse {
    clinicianUid: string;
    clinicianId: number | null;
    registrationStatus: string | null;
    synced: boolean;
    message: string;
    rawResponse?: Record<string, unknown> | unknown[];
}

export async function syncDoseSpotClinician(
    user: FirebaseUser,
    input: { clinicianUid?: string } = {}
): Promise<DoseSpotClinicianSyncResponse> {
    return apiFetchJson<DoseSpotClinicianSyncResponse>(
        getDoseSpotApiUrl('/api/v1/dosespot/clinicians/sync'),
        {
            method: 'POST',
            user,
            body: input
        }
    );
}

export async function fetchDoseSpotClinicianRegistrationStatus(
    user: FirebaseUser,
    input: { clinicianUid?: string } = {}
): Promise<DoseSpotClinicianRegistrationStatusResponse> {
    const params = new URLSearchParams();
    if (input.clinicianUid) {
        params.set('clinicianUid', input.clinicianUid);
    }

    const query = params.toString();
    return apiFetchJson<DoseSpotClinicianRegistrationStatusResponse>(
        getDoseSpotApiUrl(`/api/v1/dosespot/clinicians/registration-status${query ? `?${query}` : ''}`),
        {
            method: 'GET',
            user
        }
    );
}
