import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Notification sent (Stub)',
        recipient: data.recipient,
        type: data.type
    });
}
