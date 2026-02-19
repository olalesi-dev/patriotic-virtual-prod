import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'Eligibility screening complete (Stub)',
        eligible: true,
        program: 'GLP-1 Weight Management'
    });
}
