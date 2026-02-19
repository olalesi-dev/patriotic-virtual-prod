import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        message: 'Titration evaluated (Stub)',
        medicationId: params.id,
        recommendation: {
            action: 'Increase dose',
            newDosage: '1.7mg',
            reason: 'Patient tolerating 1.0mg well with adequate response.'
        }
    });
}
