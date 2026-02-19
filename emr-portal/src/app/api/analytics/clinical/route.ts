import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        metrics: {
            averageWeightLoss: '12.5 lbs',
            labCompliance: '94%',
            titrationSuccess: '88%'
        }
    });
}
