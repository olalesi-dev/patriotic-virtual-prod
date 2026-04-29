import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        worklist: [
            { id: 'WL-1', patientName: 'Bobby Doe', modality: 'MRI', status: 'Pending Review' }
        ]
    });
}
