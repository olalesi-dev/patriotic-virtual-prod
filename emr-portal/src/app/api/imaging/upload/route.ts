import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({
        success: true,
        message: 'DICOM study uploaded successfully (Stub)',
        studyUid: `STUDY-${Math.floor(Math.random() * 10000)}`
    });
}
