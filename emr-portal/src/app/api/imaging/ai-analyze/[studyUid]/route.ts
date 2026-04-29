import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: { studyUid: string } }
) {
    return NextResponse.json({
        success: true,
        studyUid: params.studyUid,
        analysis: {
            findings: 'No acute intracranial abnormality identified.',
            aiConfidence: 0.98
        }
    });
}
