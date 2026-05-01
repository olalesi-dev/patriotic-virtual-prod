import type { User as FirebaseUser } from 'firebase/auth';
import { apiFetchJson } from '@/lib/api-client';

export type IdentityVerificationStatus = 'not_started' | 'pending' | 'verified' | 'failed' | 'review_required';
export type IdentityVerificationMethod = 'crosscheck' | 'dob' | 'visual_id';

export interface IdentityVerificationState {
    provider: 'vouched';
    status: IdentityVerificationStatus;
    verified: boolean;
    jobId: string | null;
    internalId: string | null;
    verifiedAt: string | null;
    lastUpdatedAt: string | null;
    failureReason: string | null;
    warningCode: string | null;
    warningMessage: string | null;
    method?: IdentityVerificationMethod | null;
    requiredMethod?: IdentityVerificationMethod | null;
    workflow?: string | null;
    crosscheck?: {
        status?: string | null;
        score?: number | null;
        threshold?: number | null;
        error?: string | null;
    } | null;
    dob?: {
        status?: string | null;
        dobMatch?: boolean | null;
        error?: string | null;
    } | null;
    visualId?: {
        jobId?: string | null;
        status?: string | null;
        verified?: boolean | null;
    } | null;
}

export interface VouchedCompletionResponse {
    uid: string;
    verified: boolean;
    status: IdentityVerificationStatus;
    jobId: string | null;
    internalId: string | null;
    failureReason: string | null;
    warningCode: string | null;
    warningMessage: string | null;
}

export interface VouchedWorkflowRequest {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    dob?: string | null;
    dateOfBirth?: string | null;
    address1?: string | null;
    address?: {
        unit?: string | null;
        streetAddress?: string | null;
        address1?: string | null;
        city?: string | null;
        state?: string | null;
        postalCode?: string | null;
        zipCode?: string | null;
        zip?: string | null;
        country?: 'US' | 'CA' | string | null;
    } | string | null;
    unit?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    zipCode?: string | null;
    zip?: string | null;
    country?: 'US' | 'CA' | string | null;
}

export interface VouchedWorkflowResponse {
    uid: string;
    verified: boolean;
    status: IdentityVerificationStatus;
    method: IdentityVerificationMethod | null;
    nextStep: 'none' | 'visual_id';
    crosscheckScore: number | null;
    crosscheckThreshold: number;
    dobMatch: boolean | null;
    failureReason: string | null;
    warningMessage: string | null;
}

export function buildVouchedWebhookUrl(): string {
    const explicitOrigin = process.env.NEXT_PUBLIC_VOUCHED_WEBHOOK_ORIGIN?.trim();

    if (typeof window === 'undefined') {
        const serverOrigin = explicitOrigin || process.env.NEXT_PUBLIC_APP_URL?.trim() || '';
        return serverOrigin ? `${serverOrigin.replace(/\/$/, '')}/api/v1/vouched/webhook` : '/api/v1/vouched/webhook';
    }

    const origin = explicitOrigin || window.location.origin;
    return `${origin.replace(/\/$/, '')}/api/v1/vouched/webhook`;
}

export async function runVouchedStepUpWorkflow(
    user: FirebaseUser,
    payload: VouchedWorkflowRequest = {},
): Promise<VouchedWorkflowResponse> {
    return apiFetchJson<VouchedWorkflowResponse>('/api/v1/vouched/workflow/start', {
        method: 'POST',
        user,
        body: payload,
    });
}
