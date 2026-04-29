import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'AI intake session started (Stub)',
        sessionId: `INTAKE-${Math.floor(Math.random() * 10000)}`
    });
}
