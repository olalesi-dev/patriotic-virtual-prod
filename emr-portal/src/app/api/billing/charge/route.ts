import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'One-time charge successful (Stub)',
        chargeId: `CHG-${Math.floor(Math.random() * 10000)}`
    });
}
