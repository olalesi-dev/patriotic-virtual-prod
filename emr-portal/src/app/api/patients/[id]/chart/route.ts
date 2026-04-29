import { NextResponse } from 'next/server';
import { resolveProviderScopedPatientDetail } from '@/lib/provider-patient-detail-route';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { patient, errorResponse } = await resolveProviderScopedPatientDetail(request, params.id);
    if (errorResponse || !patient) return errorResponse;

    return NextResponse.json({
        success: true,
        patientId: params.id,
        chart: {
            problemList: patient.problemList,
            activeMedications: patient.activeMedications,
            recentEncounters: patient.recentEncounters,
            observations: patient.observations,
            orders: patient.orders,
            imagingStudies: patient.imagingStudies,
            documents: patient.documents
        }
    });
}
