export type IdentityVerificationStatus = 'not_started' | 'pending' | 'verified' | 'failed' | 'review_required';

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

export function buildVouchedWebhookUrl(): string {
    const explicitOrigin = process.env.NEXT_PUBLIC_VOUCHED_WEBHOOK_ORIGIN?.trim();

    if (typeof window === 'undefined') {
        const serverOrigin = explicitOrigin || process.env.NEXT_PUBLIC_APP_URL?.trim() || '';
        return serverOrigin ? `${serverOrigin.replace(/\/$/, '')}/api/v1/vouched/webhook` : '/api/v1/vouched/webhook';
    }

    const origin = explicitOrigin || window.location.origin;
    return `${origin.replace(/\/$/, '')}/api/v1/vouched/webhook`;
}
