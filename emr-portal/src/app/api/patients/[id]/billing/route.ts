import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        success: true,
        patientId: params.id,
        billing: {
            balance: 0.00,
            subscription: { plan: 'Elite', status: 'Active' },
            history: [{ id: 'INV-1', date: '2026-02-01', amount: 199.00, status: 'Paid' }]
        }
    });
}
