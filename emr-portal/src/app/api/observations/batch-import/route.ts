import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'Batch import from Health Gorilla initiated (Stub)'
    });
}
