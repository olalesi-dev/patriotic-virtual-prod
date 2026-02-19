import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        imaging: [
            { id: 'IMG-101', modality: 'MRI', bodyPart: 'Brain', date: '2026-02-10', status: 'Reported' }
        ]
    });
}
