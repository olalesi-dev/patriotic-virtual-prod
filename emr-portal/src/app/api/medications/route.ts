import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const data = await request.json();
    return NextResponse.json({
        success: true,
        message: 'Medication added successfully (Stub)',
        id: `MED-${Math.floor(Math.random() * 10000)}`,
        data
    });
}
