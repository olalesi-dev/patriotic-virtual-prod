import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { studyUid: string } }
) {
    return NextResponse.json({
        success: true,
        studyUid: params.studyUid,
        viewerUrl: `https://viewer.orosun.health/viewer/${params.studyUid}`
    });
}
