import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import PatientsClient from '@/components/patient/PatientsClient';
import { buildPageMetadata } from '@/lib/metadata';

// This forces dynamic rendering on the server
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata(
    'Patients',
    'Review the provider patient registry, filters, and patient lookup workflows.',
    { noIndex: true }
);

// We wrap the client component in Suspense because it uses useSearchParams
export default function PatientsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading patients...</div>}>
            <PatientsClient />
        </Suspense>
    );
}
