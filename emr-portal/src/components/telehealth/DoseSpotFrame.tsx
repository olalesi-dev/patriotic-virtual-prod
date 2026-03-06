'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface DoseSpotFrameProps {
    patientDoseSpotId?: number;
    refillsErrors?: boolean;
    height?: string;
}

export function DoseSpotFrame({ patientDoseSpotId, refillsErrors, height = '100%' }: DoseSpotFrameProps) {
    const [ssoUrl, setSsoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const fetchUrl = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('User not authenticated');
                }

                const token = await user.getIdToken();

                const params = new URLSearchParams();
                if (patientDoseSpotId) {
                    params.append('patientDoseSpotId', patientDoseSpotId.toString());
                }
                if (refillsErrors) {
                    params.append('refillsErrors', 'true');
                }

                const queryStr = params.toString() ? `?${params.toString()}` : '';
                const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

                const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/v1/dosespot/sso-url${queryStr}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to initialize DoseSpot');
                }

                const data = await response.json();

                if (!ssoUrl) {
                    setSsoUrl(data.ssoUrl);
                    setLoading(false);
                } else {
                    // Update the src directly on the iframe to avoid remounting
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

        fetchUrl();

        // Silent refresh every 8 minutes
        interval = setInterval(fetchUrl, 8 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    if (error) {
        return (
            <div className="w-full flex items-center justify-center p-6 border-red-100 bg-red-50/50 rounded-2xl border shadow-sm" style={{ minHeight: '300px' }}>
                <div className="flex flex-col items-center gap-3 py-10">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                    <p className="text-sm font-semibold text-red-800 text-center max-w-sm">
                        {error}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200" style={{ minHeight: '700px', height }}>
            {loading && (
                <div className="absolute inset-0 bg-slate-50 animate-pulse flex items-center justify-center" style={{ minHeight: '700px' }}>
                    <div className="h-6 w-32 bg-slate-200 rounded-full"></div>
                </div>
            )}
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
