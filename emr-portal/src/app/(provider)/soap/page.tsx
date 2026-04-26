import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import SoapPageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata(
    'SOAP Notes',
    'AI-powered SOAP Notes and transcription.',
    { noIndex: true }
);

export default function SoapPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading SOAP notes...</div>}>
            <SoapPageClient />
        </Suspense>
    );
}
