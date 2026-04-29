import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'Lab order sent to Health Gorilla (Stub)',
        status: 'Transmitted'
    });
}
