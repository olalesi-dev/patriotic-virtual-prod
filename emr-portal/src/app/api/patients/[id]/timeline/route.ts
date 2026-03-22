import { NextResponse } from 'next/server';
import { resolveProviderScopedPatientDetail } from '@/lib/provider-patient-detail-route';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { patient, errorResponse } = await resolveProviderScopedPatientDetail(request, params.id);
    if (errorResponse || !patient) return errorResponse;

    const timeline = [
        ...patient.recentEncounters.map((encounter) => ({
            date: encounter.date,
            action: 'Encounter',
            details: `${encounter.title} • ${encounter.status}`
        })),
        ...patient.orders.map((order) => ({
            date: order.orderedAt ?? '',
            action: 'Order',
            details: `${order.description} • ${order.status}`
        })),
        ...patient.documents.map((document) => ({
            date: document.date ?? '',
            action: document.category,
            details: document.name
        }))
    ].sort((first, second) => second.date.localeCompare(first.date));

    return NextResponse.json({
        success: true,
        patientId: params.id,
        timeline
    });
}
