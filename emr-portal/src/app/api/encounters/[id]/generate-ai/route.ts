import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        message: 'AI Note generated (Stub)',
        encounterId: params.id,
        generatedNote: {
            subjective: 'Patient reports appetite suppression is adequate...',
            objective: 'Video exam performed. Patient appears well...',
            assessment: 'Progressing well on current protocol...',
            plan: 'Continue current dose...'
        }
    });
}
