import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: { setName: string } }
) {
    return NextResponse.json({
        success: true,
        message: `Order set '${params.setName}' used (Stub)`,
        orders: ['CMP', 'HbA1c', 'Lipid Panel']
    });
}
