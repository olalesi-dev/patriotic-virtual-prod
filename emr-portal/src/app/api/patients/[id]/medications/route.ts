import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        medications: [
            { id: 'MED-1', name: 'Semaglutide', dosage: '1.0mg', status: 'Active' }
        ]
    });
}
