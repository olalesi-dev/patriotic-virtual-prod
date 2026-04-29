import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({
        success: true,
        pendingOrders: [
            { id: 'ORD-101', patientName: 'Bobby Doe', type: 'lab', description: 'GLP-1 Panel' }
        ]
    });
}
