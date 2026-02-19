import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        consents: [
            { id: 'CONS-1', title: 'Telehealth Consent', status: 'Signed', date: '2026-01-06' }
        ]
    });
}
