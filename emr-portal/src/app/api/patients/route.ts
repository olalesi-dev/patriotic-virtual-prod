import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const data = await request.json();
        return NextResponse.json({
            success: true,
            message: 'Patient created successfully (Stub)',
            id: Math.floor(Math.random() * 10000),
            data
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
}
