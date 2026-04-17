import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { sendMessage } from '@/lib/server-messaging';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const attachmentSchema = z.object({
    name: z.string().trim().min(1).max(240),
    url: z.string().trim().min(1).max(4_096),
    type: z.string().trim().min(1).max(240)
});

const sendMessageSchema = z.object({
    threadId: z.string().trim().min(1).optional(),
    recipientId: z.string().trim().min(1).optional(),
    recipientType: z.enum(['patient', 'provider']).optional(),
    subject: z.string().trim().min(1).max(160).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    body: z.string().trim().max(5_000).default(''),
    attachment: attachmentSchema.nullable().optional(),
    teamId: z.string().trim().min(1).optional(),
    teamName: z.string().trim().min(1).max(160).optional()
}).refine((value) => value.threadId || value.recipientId, {
    message: 'Thread id or recipient is required.'
}).refine((value) => value.body.trim().length > 0 || Boolean(value.attachment), {
    message: 'Message body is required.'
});

export async function POST(request: Request) {
    const { user, errorResponse } = await requireAuthenticatedUser(request, { resolveRole: false });
    if (errorResponse) return errorResponse;
    if (!user) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (!db) {
        return NextResponse.json(
            { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
            { status: 500 }
        );
    }

    try {
        const parsedBody = sendMessageSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            const firstIssue = parsedBody.error.issues[0]?.message ?? 'Invalid message payload.';
            return NextResponse.json({ success: false, error: firstIssue }, { status: 400 });
        }

        const result = await sendMessage(db, user, parsedBody.data);
        return NextResponse.json(result);
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Message send API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
