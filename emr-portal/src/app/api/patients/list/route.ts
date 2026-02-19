import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const service = searchParams.get('service');

    return NextResponse.json({
        success: true,
        filters: { status, provider, service },
        patients: [
            { id: 1, name: 'Bobby Doe', status: 'Active', serviceLine: 'Primary Care' },
            { id: 2, name: 'John Doe', status: 'Wait List', serviceLine: 'Behavioral Health' }
        ]
    });
}
