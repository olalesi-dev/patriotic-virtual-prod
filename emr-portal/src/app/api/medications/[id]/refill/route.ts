import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        message: 'Refill request processed (Stub)',
        medicationId: params.id,
        status: 'Approved'
    });
}
