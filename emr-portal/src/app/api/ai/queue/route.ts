import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        queue: [
            { id: 'Q-1', module: 'Titration', patient: 'Bobby Doe', action: 'Review dose increase' }
        ]
    });
}
