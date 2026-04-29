import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        retention: {
            month1: '98%',
            month3: '92%',
            month6: '85%'
        }
    });
}
