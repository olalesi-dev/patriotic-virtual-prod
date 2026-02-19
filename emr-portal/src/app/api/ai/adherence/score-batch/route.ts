import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'Adherence scoring batch complete (Stub)',
        patientsProcessed: 1250
    });
}
