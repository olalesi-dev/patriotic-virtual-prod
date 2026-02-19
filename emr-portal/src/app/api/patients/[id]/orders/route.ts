import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        orders: [
            { id: 'ORD-101', type: 'lab', status: 'In Progress', description: 'GLP-1 Panel' }
        ]
    });
}
