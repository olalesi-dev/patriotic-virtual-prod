import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Imaging order created (Stub)',
        id: `IMG-ORD-${Math.floor(Math.random() * 10000)}`,
        data
    });
}
