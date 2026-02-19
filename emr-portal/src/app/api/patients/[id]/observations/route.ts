import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        observations: [
            { id: 'OBS-1', type: 'vital', code: 'weight', value: 270, unit: 'lbs', date: '2026-02-15' }
        ]
    });
}
