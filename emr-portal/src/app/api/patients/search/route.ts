import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const field = searchParams.get('field');

    return NextResponse.json({
        success: true,
        query: { q, field },
        results: [
            { id: 1, name: 'Bobby Doe', mrn: 'MRN-001234', email: 'bobby@example.com' }
        ]
    });
}
