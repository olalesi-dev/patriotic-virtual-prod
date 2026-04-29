import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        encounterId: params.id,
        data: { id: params.id, date: '2026-02-19', status: 'Draft', chiefComplaint: 'Follow-up' }
    });
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Encounter updated successfully (Stub)',
        encounterId: params.id,
        updatedData: data
    });
}
