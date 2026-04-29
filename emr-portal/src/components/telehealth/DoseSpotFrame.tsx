'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { apiFetchJson } from '@/lib/api-client';
import { getDoseSpotApiUrl } from '@/lib/dosespot-client';
import type { DoseSpotSsoUrlResponse } from '@/lib/dosespot-patient-sync';

const inFlightSsoRequests = new Map<string, Promise<DoseSpotSsoUrlResponse>>();

function fetchDoseSpotSsoUrlDeduped(
    userUid: string,
    requestUrl: string,
    user: NonNullable<typeof auth.currentUser>
): Promise<DoseSpotSsoUrlResponse> {
    const requestKey = `${userUid}:${requestUrl}`;
    const existingRequest = inFlightSsoRequests.get(requestKey);
    if (existingRequest) return existingRequest;

    const requestPromise = apiFetchJson<DoseSpotSsoUrlResponse>(requestUrl, { user })
        .finally(() => {
            inFlightSsoRequests.delete(requestKey);
        });

    inFlightSsoRequests.set(requestKey, requestPromise);
    return requestPromise;
}

interface DoseSpotFrameProps {
    /** Resolve patient context from our internal patient UID */
    patientUid?: string;
    /** Open directly to a patient's chart (patient's DoseSpot ID, not our internal ID) */
    patientDoseSpotId?: number;
    /** Link the session to a specific consultation/encounter ID */
    encounterId?: string;
    /** Open the Refills & Transmission Errors view instead of a patient chart */
    refillsErrors?: boolean;
    /** Height of the iframe container */
    height?: string;
}

export function DoseSpotFrame({
    patientUid,
    patientDoseSpotId,
    encounterId,
    refillsErrors,
    height = '920px',
}: DoseSpotFrameProps) {
    const [ssoUrl, setSsoUrl] = useState<string | null>(null);
    const [syncState, setSyncState] = useState<DoseSpotSsoUrlResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const buildQueryString = () => {
        const params = new URLSearchParams();
        if (patientUid)         params.append('patientUid',         patientUid);
        if (patientDoseSpotId)  params.append('patientDoseSpotId',  patientDoseSpotId.toString());
        if (encounterId)        params.append('encounterId',         encounterId);
        if (refillsErrors)      params.append('refillsErrors',       'true');
        return params.toString() ? `?${params.toString()}` : '';
    };

    const fetchUrl = async () => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            setLoading(true);
            setError(null);

            const queryStr = buildQueryString();
            const requestUrl = getDoseSpotApiUrl(`/api/v1/dosespot/sso-url${queryStr}`);
            const data = await fetchDoseSpotSsoUrlDeduped(user.uid, requestUrl, user);

            setSyncState(data);

            if (data.syncStatus !== 'ready' || !data.ssoUrl) {
                setSsoUrl(null);
                setLoading(false);
                return;
            }

            setSsoUrl(data.ssoUrl);
            setLoading(false);
        } catch (err: any) {
            console.error('DoseSpot load error:', err);
            setError(err.message || 'Unable to load prescription tool. Please refresh the page.');
            setSyncState(null);
            setSsoUrl(null);
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchUrl();
        return undefined;

        // Re-fetch if the patient/encounter context changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientUid, patientDoseSpotId, encounterId, refillsErrors]);

    if (syncState && syncState.syncStatus !== 'ready') {
        const candidateText = syncState.candidatePatientIds.length > 0
            ? `Possible DoseSpot matches: ${syncState.candidatePatientIds.join(', ')}.`
            : null;
        const missingFieldsText = syncState.missingFields.length > 0
            ? `Missing fields: ${syncState.missingFields.join(', ')}.`
            : null;
        const detailedErrorText = syncState.lastError && syncState.lastError !== syncState.message
            ? syncState.lastError
            : null;

        return (
            <div
                className="w-full flex items-center justify-center p-6 border-amber-100 bg-amber-50/70 rounded-2xl border shadow-sm"
                style={{ minHeight: '320px' }}
            >
                <div className="flex flex-col items-center gap-4 py-10 text-center max-w-xl">
                    <AlertCircle className="w-10 h-10 text-amber-500" />
                    <div className="space-y-2">
                        <p className="text-base font-black uppercase tracking-widest text-amber-800">
                            DoseSpot Patient Sync Required
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                            {syncState.message}
                        </p>
                        {detailedErrorText && (
                            <p className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-left text-sm text-amber-800">
                                {detailedErrorText}
                            </p>
                        )}
                        {missingFieldsText && (
                            <p className="text-sm text-slate-600">{missingFieldsText}</p>
                        )}
                        {candidateText && (
                            <p className="text-sm text-slate-600">{candidateText}</p>
                        )}
                    </div>
                    <button
                        onClick={() => { setError(null); setLoading(true); void fetchUrl(); }}
                        className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase tracking-widest hover:underline"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry DoseSpot Sync
                    </button>
                </div>
            </div>
        );
    }

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
                        onClick={() => { setError(null); setLoading(true); void fetchUrl(); }}
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
            className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700"
            style={{ minHeight: '1080px', height }}
        >
            {/* Loading shimmer */}
            {loading && (
                <div
                    className="absolute inset-0 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 flex flex-col items-center justify-center gap-4"
                    style={{ minHeight: '1080px' }}
                >
                    <div className="w-10 h-10 border-4 border-sky-200 dark:border-sky-800 border-t-sky-500 rounded-full animate-spin" />
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Loading DoseSpot eRx…
                    </p>
                </div>
            )}

            {/* DoseSpot iframe */}
            {ssoUrl && (
                <iframe
                    src={ssoUrl || ''}
                    style={{ width: '100%', height: '100%', border: 'none', minHeight: '1080px' }}
                    title="DoseSpot eRx"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                    onLoad={() => setLoading(false)}
                    className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
                />
            )}
        </div>
    );
}
