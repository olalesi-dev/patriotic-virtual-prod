import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Tags added successfully (Stub)',
        patientId: params.id,
        tags: data.tags
    });
}
