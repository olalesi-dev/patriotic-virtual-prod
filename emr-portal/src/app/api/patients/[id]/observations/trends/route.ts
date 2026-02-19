import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    return NextResponse.json({
        success: true,
        patientId: params.id,
        code,
        trends: [
            { date: '2026-01-01', value: 285 },
            { date: '2026-02-01', value: 275 },
            { date: '2026-02-15', value: 270 }
        ]
    });
}
