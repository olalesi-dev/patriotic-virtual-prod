import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        message: 'Titration approved (Stub)',
        medicationId: params.id,
        timestamp: new Date().toISOString()
    });
}
