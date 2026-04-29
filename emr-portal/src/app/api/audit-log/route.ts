import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    const action = searchParams.get('action');

    return NextResponse.json({
        success: true,
        filters: { user, action },
        logs: [
            { timestamp: new Date().toISOString(), user: 'Dr. Olufolaju', action: 'Sign Encounter', details: 'ENC-123' }
        ]
    });
}
