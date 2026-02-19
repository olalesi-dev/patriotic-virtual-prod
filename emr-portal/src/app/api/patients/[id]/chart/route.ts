import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        chart: {
            problemList: [{ code: 'E66.01', description: 'Morbid obesity' }],
            activeMedications: [{ name: 'Semaglutide', dosage: '1.0mg' }],
            recentVitals: { wt: 270, bp: '128/82' }
        }
    });
}
