import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'Patient communication generated (Stub)',
        content: 'Dear Bobby, your latest lab results look excellent...'
    });
}
