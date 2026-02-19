import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Encounter signed and locked (Stub)',
        encounterId: params.id,
        signature: data.signature,
        timestamp: new Date().toISOString()
    });
}
