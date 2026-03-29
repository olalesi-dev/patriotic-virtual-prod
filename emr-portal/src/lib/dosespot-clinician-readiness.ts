import type { User as FirebaseUser } from 'firebase/auth';
import { apiFetchJson } from '@/lib/api-client';
import { getDoseSpotApiUrl } from '@/lib/dosespot-client';

export type DoseSpotClinicianReadinessStatus =
    | 'not_started'
    | 'agreements_pending'
    | 'clinician_confirmation_pending'
    | 'idp_pending'
    | 'idp_questions'
    | 'otp_required'
    | 'tfa_pending'
    | 'pin_reset_required'
    | 'locked'
    | 'ready';

export interface DoseSpotLegalAgreement {
    agreementId: string;
    title: string;
    accepted: boolean;
    acceptedAt: string | null;
    version: string | null;
}

export interface DoseSpotIdpQuestionOption {
    optionId: string;
    label: string;
}

export interface DoseSpotIdpQuestion {
    questionId: string;
    prompt: string;
    options: DoseSpotIdpQuestionOption[];
}

export interface DoseSpotIdpDisclaimer {
    title: string | null;
    body: string | null;
    version: string | null;
}

export interface DoseSpotClinicianReadiness {
    clinicianUid: string;
    clinicianId: number | null;
    readinessStatus: DoseSpotClinicianReadinessStatus;
    clinicianConfirmed: boolean | null;
    accountLocked: boolean;
    agreementsAccepted: boolean;
    legalAgreements: DoseSpotLegalAgreement[];
    idp: {
        initializedAt: string | null;
        disclaimerAccepted: boolean;
        disclaimerAcceptedAt: string | null;
        status: string | null;
        pendingQuestionsCount: number;
        questions: DoseSpotIdpQuestion[];
        otpRequired: boolean;
        completedAt: string | null;
        disclaimer: DoseSpotIdpDisclaimer | null;
        lastResponse: Record<string, unknown> | null;
    };
    tfa: {
        enabled: boolean;
        activatedAt: string | null;
        deactivatedAt: string | null;
    };
    pin: {
        resetRequired: boolean;
        lastResetAt: string | null;
    };
    lastEventType: string | null;
    lastEventAt: string | null;
    lastOperation: string | null;
    lastError: string | null;
}

export interface DoseSpotClinicianActionResponse {
    readiness: DoseSpotClinicianReadiness;
    agreements?: DoseSpotLegalAgreement[];
    disclaimer?: DoseSpotIdpDisclaimer | null;
    questions?: DoseSpotIdpQuestion[];
    otpRequired?: boolean;
    rawResponse?: Record<string, unknown> | unknown[];
    message: string;
}

export async function fetchDoseSpotClinicianReadiness(
    user: FirebaseUser
): Promise<DoseSpotClinicianReadiness> {
    const response = await apiFetchJson<{ readiness: DoseSpotClinicianReadiness }>(
        getDoseSpotApiUrl('/api/v1/dosespot/clinicians/readiness'),
        {
            method: 'GET',
            user
        }
    );

    return response.readiness;
}

async function postClinicianAction(
    user: FirebaseUser,
    path: string,
    method: 'GET' | 'POST',
    body?: Record<string, unknown>
): Promise<DoseSpotClinicianActionResponse> {
    return apiFetchJson<DoseSpotClinicianActionResponse>(
        getDoseSpotApiUrl(path),
        {
            method,
            user,
            ...(body ? { body } : {})
        }
    );
}

export function fetchDoseSpotLegalAgreements(user: FirebaseUser) {
    return postClinicianAction(user, '/api/v1/dosespot/clinicians/legal-agreements', 'GET');
}

export function acceptDoseSpotLegalAgreement(user: FirebaseUser, body: Record<string, unknown>) {
    return postClinicianAction(user, '/api/v1/dosespot/clinicians/legal-agreements/accept', 'POST', body);
}

export function fetchDoseSpotIdpDisclaimer(user: FirebaseUser) {
    return postClinicianAction(user, '/api/v1/dosespot/clinicians/idp/disclaimer', 'GET');
}

export function acceptDoseSpotIdpDisclaimer(user: FirebaseUser, body: Record<string, unknown> = {}) {
    return postClinicianAction(user, '/api/v1/dosespot/clinicians/idp/disclaimer', 'POST', body);
}

export function initDoseSpotIdp(user: FirebaseUser) {
    return postClinicianAction(user, '/api/v1/dosespot/clinicians/idp/init', 'POST');
}

export function startDoseSpotIdp(user: FirebaseUser, body: Record<string, unknown> = {}) {
    return postClinicianAction(user, '/api/v1/dosespot/clinicians/idp/start', 'POST', body);
}

export function submitDoseSpotIdpAnswers(user: FirebaseUser, body: Record<string, unknown>) {
    return postClinicianAction(user, '/api/v1/dosespot/clinicians/idp/answers', 'POST', body);
}

export function submitDoseSpotIdpOtp(user: FirebaseUser, body: Record<string, unknown>) {
    return postClinicianAction(user, '/api/v1/dosespot/clinicians/idp/otp', 'POST', body);
}
