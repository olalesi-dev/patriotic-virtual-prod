"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { VisitRoom } from '@/components/telehealth/VisitRoom';
import { SoapNoteModal } from '@/components/telehealth/SoapNoteModal';

// Simulate API Response for now (until backend is fully CORS enabled for local dev)
const MOCK_SESSION = {
    provider: 'DOXY',
    joinLink: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
    patientName: 'John Doe',
    providerName: 'Dr. Patriotic'
};

export default function TelehealthPage() {
    const searchParams = useSearchParams();
    const appointmentId = searchParams.get('appointmentId');
    const [session, setSession] = useState<typeof MOCK_SESSION | null>(null);

    const [showSoapModal, setShowSoapModal] = useState(false);
    const [rawTranscript, setRawTranscript] = useState('');

    useEffect(() => {
        // In real implementation:
        // fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/telehealth/${appointmentId}`)
        //   .then(res => res.json())
        //   .then(data => setSession(data));

        // For demo:
        setTimeout(() => setSession(MOCK_SESSION), 1000);
    }, [appointmentId]);

    const handleEndVisit = (transcript: string) => {
        setRawTranscript(transcript);
        setShowSoapModal(true);
    };

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
        <>
            <VisitRoom
                role="provider" // Hardcoded for demo
                providerName={session.providerName}
                patientName={session.patientName}
                videoLink={session.joinLink}
                onEndVisit={handleEndVisit}
            />
            
            {showSoapModal && (
                <SoapNoteModal
                    appointmentId={appointmentId || 'demo-appt-id'}
                    rawTranscript={rawTranscript}
                    onClose={() => setShowSoapModal(false)}
                    onSave={(note) => {
                        setShowSoapModal(false);
                        // Optionally redirect back to dashboard or patient chart
                        window.location.href = '/dashboard';
                    }}
                />
            )}
        </>
    );
}
