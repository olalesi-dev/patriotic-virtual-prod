import { PatientDetailClient } from '@/components/patient/PatientDetailClient';

export const dynamic = 'force-dynamic';

export default function PatientDetailPage({ params }: { params: { id: string } }) {
    return <PatientDetailClient patientId={params.id} />;
}
