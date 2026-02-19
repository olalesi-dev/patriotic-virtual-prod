import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'Titration evaluated (Stub)',
        recommendation: 'Increase dose by 0.25mg'
    });
}
