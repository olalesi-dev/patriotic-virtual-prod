
import React, { Suspense } from 'react';
import PatientsClient from '@/components/patient/PatientsClient';

// This forces dynamic rendering on the server
export const dynamic = "force-dynamic";

// We wrap the client component in Suspense because it uses useSearchParams
export default function PatientsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading patients...</div>}>
            <PatientsClient />
        </Suspense>
    );
}
