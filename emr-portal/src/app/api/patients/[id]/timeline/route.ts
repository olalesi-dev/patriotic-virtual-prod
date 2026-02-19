import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        timeline: [
            { date: '2026-02-15', action: 'Lab Results Received', details: 'GLP-1 Panel resulted' },
            { date: '2026-02-03', action: 'Encounter Signed', details: 'GLP-1 Follow-up' }
        ]
    });
}
