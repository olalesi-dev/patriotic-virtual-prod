import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        performance: {
            scribeAccuracy: '96%',
            titrationAgreement: '92%',
            intakeEfficiency: '+40%'
        }
    });
}
