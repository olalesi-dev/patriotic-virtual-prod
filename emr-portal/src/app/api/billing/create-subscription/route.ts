import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'Stripe subscription created (Stub)',
        subscriptionId: `SUB-${Math.floor(Math.random() * 10000)}`
    });
}
