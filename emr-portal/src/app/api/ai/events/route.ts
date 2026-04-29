import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        events: [
            { id: 1, module: 'AI Scribe', event: 'Note Generation', timestamp: new Date().toISOString() }
        ]
    });
}
