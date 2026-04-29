import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const status = searchParams.get('status');

    return NextResponse.json({
        success: true,
        cohort: { service, status },
        count: 1250,
        trends: [
            { month: 'Jan', active: 1100 },
            { month: 'Feb', active: 1250 }
        ]
    });
}
