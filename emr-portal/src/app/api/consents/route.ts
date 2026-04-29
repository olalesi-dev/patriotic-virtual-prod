import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Consent recorded (Stub)',
        id: `CONS-${Math.floor(Math.random() * 10000)}`,
        data
    });
}
