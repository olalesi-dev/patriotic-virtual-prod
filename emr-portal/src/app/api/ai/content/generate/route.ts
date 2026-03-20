import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'Marketing content generated (Stub)',
        content: 'Discover the Patriotic Telehealth difference in weight management...'
    });
}
