import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Patient Search',
    'Patient search route redirecting to the provider patient registry.',
    { noIndex: true }
);

export default function ProviderPatientSearchPage() {
    redirect('/patients');
}
