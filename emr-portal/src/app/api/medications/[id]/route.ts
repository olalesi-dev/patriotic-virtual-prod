import { NextResponse } from 'next/server';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Medication updated (Stub)',
        medicationId: params.id,
        updatedData: data
    });
}
