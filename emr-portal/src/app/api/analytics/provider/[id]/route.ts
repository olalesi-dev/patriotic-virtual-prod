import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        providerId: params.id,
        metrics: {
            encountersCompleted: 145,
            averageNoteTime: '8.5 min',
            patientSatisfaction: '4.9/5'
        }
    });
}
