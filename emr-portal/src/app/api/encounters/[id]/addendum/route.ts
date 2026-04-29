import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Addendum added (Stub)',
        encounterId: params.id,
        addendum: data.text,
        timestamp: new Date().toISOString()
    });
}
