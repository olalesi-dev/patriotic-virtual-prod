import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        messages: [
            { id: 1, type: 'received', text: 'How are you?', timestamp: '10:30 AM' }
        ]
    });
}
