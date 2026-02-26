"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { VisitRoom } from '@/components/telehealth/VisitRoom';

// Simulate API Response for now (until backend is fully CORS enabled for local dev)
const MOCK_SESSION = {
    provider: 'DOXY',
    joinLink: 'https://doxy.me/DrStrange',
    patientName: 'John Doe',
    providerName: 'Dr. Patriotic'
};

export default function TelehealthPage() {
    const searchParams = useSearchParams();
    const appointmentId = searchParams.get('appointmentId');
    const [session, setSession] = useState<typeof MOCK_SESSION | null>(null);

    useEffect(() => {
        // In real implementation:
        // fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/telehealth/${appointmentId}`)
        //   .then(res => res.json())
        //   .then(data => setSession(data));

        // For demo:
        setTimeout(() => setSession(MOCK_SESSION), 1000);
    }, [appointmentId]);

    if (!session) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                    <p>Connecting to Secure Telehealth Room...</p>
                </div>
            </div>
        );
    }

    return (
        <VisitRoom
            role="provider" // Hardcoded for demo
            providerName={session.providerName}
            patientName={session.patientName}
            videoLink={session.joinLink}
        />
    );
}
