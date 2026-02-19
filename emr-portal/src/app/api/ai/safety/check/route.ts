import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        safetyCheck: {
            status: 'Safe',
            contraindications: [],
            warnings: ['Monitor renal function']
        }
    });
}
