import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        encounters: [
            { id: 'ENC-123', date: '2026-02-15', title: 'GLP-1 Follow-up', status: 'Signed' }
        ]
    });
}
