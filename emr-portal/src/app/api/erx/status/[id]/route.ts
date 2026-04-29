import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        rxId: params.id,
        status: 'Transmitted',
        details: 'Received by pharmacy'
    });
}
