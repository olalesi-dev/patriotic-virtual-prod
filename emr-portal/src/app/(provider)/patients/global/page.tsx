import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import PatientsClient from '@/components/patient/PatientsClient';
import { buildPageMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata(
    'Global Patients',
    'Review the full practice patient registry beyond the current provider scope.',
    { noIndex: true }
);

export default function GlobalPatientsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading global patients...</div>}>
            <PatientsClient scope="global" />
        </Suspense>
    );
}
