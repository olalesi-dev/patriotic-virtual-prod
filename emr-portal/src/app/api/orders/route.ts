import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Order created successfully (Stub)',
        id: `ORD-${Math.floor(Math.random() * 10000)}`,
        data
    });
}
