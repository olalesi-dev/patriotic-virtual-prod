import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        data: { id: params.id, name: 'Bobby Doe', dob: '1985-05-15', status: 'Active' }
    });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Patient updated successfully (Stub)',
        patientId: params.id,
        updatedData: data
    });
}
