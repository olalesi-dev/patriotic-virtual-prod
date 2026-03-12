'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface DoseSpotFrameProps {
    /** Open directly to a patient's chart (patient's DoseSpot ID, not our internal ID) */
    patientDoseSpotId?: number;
    /** Prescribe on behalf of a specific clinician (their DoseSpot ID).
     *  Typically the same as the signed-in clinician unless using a shared admin account. */
    onBehalfOfUserId?: number;
    /** Link the session to a specific consultation/encounter ID */
    encounterId?: string;
    /** Open the Refills & Transmission Errors view instead of a patient chart */
    refillsErrors?: boolean;
    /** Height of the iframe container */
    height?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://patriotic-virtual-backend-ckia3at3ra-uc.a.run.app';

export function DoseSpotFrame({
    patientDoseSpotId,
    onBehalfOfUserId,
    encounterId,
    refillsErrors,
    height = '100%',
}: DoseSpotFrameProps) {
    const [ssoUrl, setSsoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const buildQueryString = () => {
        const params = new URLSearchParams();
        if (patientDoseSpotId)  params.append('patientDoseSpotId',  patientDoseSpotId.toString());
        if (onBehalfOfUserId)   params.append('onBehalfOfUserId',   onBehalfOfUserId.toString());
        if (encounterId)        params.append('encounterId',         encounterId);
        if (refillsErrors)      params.append('refillsErrors',       'true');
        return params.toString() ? `?${params.toString()}` : '';
    };

    const fetchUrl = async (isRefresh = false) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const token = await user.getIdToken();
            const queryStr = buildQueryString();

            const response = await fetch(`${API_URL}/api/v1/dosespot/sso-url${queryStr}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `DoseSpot error: ${response.status}`);
            }

            const data = await response.json();

            if (!isRefresh) {
                // First load — set via state (causes iframe mount)
                setSsoUrl(data.ssoUrl);
                setLoading(false);
            } else {
                // Silent refresh — update iframe src directly to avoid page flash
                if (iframeRef.current) {
                    iframeRef.current.src = data.ssoUrl;
                } else {
                    setSsoUrl(data.ssoUrl);
                }
            }
        } catch (err: any) {
            console.error('DoseSpot load error:', err);
            setError(err.message || 'Unable to load prescription tool. Please refresh the page.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUrl(false);

        // Silent token refresh every 8 minutes (DoseSpot SSO tokens expire after ~15 min)
        const interval = setInterval(() => fetchUrl(true), 8 * 60 * 1000);
        return () => clearInterval(interval);

        // Re-fetch if the patient/encounter context changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientDoseSpotId, onBehalfOfUserId, encounterId, refillsErrors]);

    if (error) {
        return (
            <div
                className="w-full flex items-center justify-center p-6 border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border shadow-sm"
                style={{ minHeight: '300px' }}
            >
                <div className="flex flex-col items-center gap-4 py-10 text-center max-w-sm">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
                    <button
                        onClick={() => { setError(null); setLoading(true); fetchUrl(false); }}
                        className="flex items-center gap-2 text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest hover:underline"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700"
            style={{ minHeight: '700px', height }}
        >
            {/* Loading shimmer */}
            {loading && (
                <div
                    className="absolute inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-4"
                    style={{ minHeight: '700px' }}
                >
                    <div className="w-10 h-10 border-4 border-sky-200 dark:border-sky-800 border-t-sky-500 rounded-full animate-spin" />
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Loading DoseSpot eRx…
                    </p>
                </div>
            )}

            {/* DoseSpot iframe */}
            {(ssoUrl || !loading) && (
                <iframe
                    ref={iframeRef}
                    src={ssoUrl || ''}
                    style={{ width: '100%', height: '100%', border: 'none', minHeight: '700px' }}
                    title="DoseSpot eRx"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                    onLoad={() => setLoading(false)}
                    className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
                />
            )}
        </div>
    );
}
