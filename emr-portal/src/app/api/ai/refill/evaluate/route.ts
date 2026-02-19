import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        refillEligibility: {
            status: 'Eligible',
            reason: 'Last visit within 90 days, labs stable.'
        }
    });
}
