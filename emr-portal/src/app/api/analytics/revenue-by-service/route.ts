import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        revenue: [
            { service: 'Weight Loss', mrr: '$320,000' },
            { service: 'Mens Health', mrr: '$85,000' },
            { service: 'Primary Care', mrr: '$45,000' }
        ]
    });
}
