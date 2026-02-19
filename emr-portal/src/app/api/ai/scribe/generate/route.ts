import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'SOAP note generated (Stub)',
        note: { subjective: '...', objective: '...', assessment: '...', plan: '...' }
    });
}
