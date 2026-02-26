import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: { uid: string } }
) {
    try {
        if (!auth) {
            throw new Error('Firebase Admin not initialized');
        }
        const { uid } = params;
        const user = await auth!.getUser(uid);

        if (!user.email) {
            return NextResponse.json({ success: false, error: 'User has no email' }, { status: 400 });
        }

        // Generate reset link
        const link = await auth!.generatePasswordResetLink(user.email);

        return NextResponse.json({
            success: true,
            message: 'Reset link generated successfully',
            link
        });
    } catch (error: any) {
        console.error('Error generating reset link:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
