import type { Metadata } from 'next';
import { PatientDetailClient } from '@/components/patient/PatientDetailClient';
import { buildPageMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata(
    'Patient Chart',
    'Review provider-scoped patient chart details, demographics, medications, and encounters.',
    { noIndex: true }
);

export default function PatientDetailPage({ params }: { params: { id: string } }) {
    return <PatientDetailClient patientId={params.id} />;
}
