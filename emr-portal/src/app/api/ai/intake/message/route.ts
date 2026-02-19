import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        response: 'Thank you for that information. Do you have any allergies?',
        receivedMessage: data.message
    });
}
