import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        metrics: {
            mrr: '$450,000',
            churnRate: '2.4%',
            ltv: '$3,200'
        }
    });
}
