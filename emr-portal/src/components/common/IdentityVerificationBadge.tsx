"use client";

import { AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import type { PatientIdentityVerificationSummary } from '@/lib/patient-registry-types';

interface IdentityVerificationBadgeProps {
    verification?: PatientIdentityVerificationSummary | null;
    compact?: boolean;
}

function getMethodLabel(method: PatientIdentityVerificationSummary['method']): string {
    if (method === 'crosscheck') return 'CrossCheck';
    if (method === 'dob') return 'DOB';
    if (method === 'visual_id') return 'IDV';
    return 'Vouched';
}

export function IdentityVerificationBadge({ verification, compact = false }: IdentityVerificationBadgeProps) {
    const status = verification?.status ?? 'not_started';
    const method = getMethodLabel(verification?.method ?? null);

    if (status === 'verified' || verification?.verified) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {compact ? 'Verified' : `${method} verified`}
            </span>
        );
    }

    if (status === 'review_required') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
                <Clock className="h-3.5 w-3.5" />
                {compact ? 'Review' : 'ID review'}
            </span>
        );
    }

    if (status === 'pending' || verification?.requiredMethod === 'visual_id') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">
                <Clock className="h-3.5 w-3.5" />
                {compact ? 'Pending' : 'Verification pending'}
            </span>
        );
    }

    if (status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">
                <AlertCircle className="h-3.5 w-3.5" />
                {compact ? 'Failed' : 'Verification failed'}
            </span>
        );
    }

    return null;
}
