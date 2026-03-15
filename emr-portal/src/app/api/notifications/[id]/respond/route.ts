import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { createNotification } from '@/lib/server-notifications';
import { mapTeamSnapshot, mapUserDocToMember, toProviderRole } from '@/lib/server-teams';
import { ensureProviderAccess, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const respondSchema = z.object({
    decision: z.enum(['accept', 'reject'])
});

function asString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const { user, errorResponse } = await requireAuthenticatedUser(request, { resolveRole: false });
    if (errorResponse) return errorResponse;
    if (!user) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const providerAccessError = ensureProviderAccess(user);
    if (providerAccessError) return providerAccessError;

    if (!db) {
        return NextResponse.json(
            { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
            { status: 500 }
        );
    }

    try {
        const parsedBody = respondSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid response payload.' }, { status: 400 });
        }

        const notificationId = params.id;
        if (!notificationId) {
            return NextResponse.json({ success: false, error: 'Notification id is required.' }, { status: 400 });
        }

        const [notificationDoc, currentUserDoc] = await Promise.all([
            db.collection('notifications').doc(notificationId).get(),
            db.collection('users').doc(user.uid).get()
        ]);

        if (!notificationDoc.exists) {
            return NextResponse.json({ success: false, error: 'Notification not found.' }, { status: 404 });
        }

        const notificationData = notificationDoc.data() as Record<string, unknown>;
        if (asString(notificationData.recipientId) !== user.uid) {
            return NextResponse.json({ success: false, error: 'You do not have access to this notification.' }, { status: 403 });
        }

        if (asString(notificationData.type) !== 'team_invite') {
            return NextResponse.json({ success: false, error: 'This notification cannot be actioned.' }, { status: 400 });
        }

        const metadata = (typeof notificationData.metadata === 'object' && notificationData.metadata !== null)
            ? notificationData.metadata as Record<string, unknown>
            : {};

        const teamId = asString(metadata.teamId);
        const inviterId = asString(metadata.inviterId);
        if (!teamId) {
            return NextResponse.json({ success: false, error: 'Team metadata missing from invite.' }, { status: 400 });
        }

        const userRole = toProviderRole(user.token.role ?? currentUserDoc.data()?.role ?? user.role);
        if (!userRole) {
            return NextResponse.json({ success: false, error: 'Only doctors/providers can respond to team invitations.' }, { status: 403 });
        }

        const currentMember = mapUserDocToMember(currentUserDoc) ?? {
            id: user.uid,
            name: user.email?.split('@')[0] ?? 'Provider',
            email: user.email,
            role: userRole
        };

        await db.runTransaction(async (transaction) => {
            const inviteSnapshot = await transaction.get(db!.collection('notifications').doc(notificationId));
            if (!inviteSnapshot.exists) {
                throw new Error('Notification no longer exists.');
            }

            const latestInvite = inviteSnapshot.data() as Record<string, unknown>;
            const latestStatus = asString(latestInvite.actionStatus);
            if (latestStatus && latestStatus !== 'pending') {
                throw new Error('Invitation already processed.');
            }

            const teamRef = db!.collection('teams').doc(teamId);
            const teamSnapshot = await transaction.get(teamRef);
            const team = mapTeamSnapshot(teamSnapshot);
            if (!team) {
                throw new Error('Team no longer exists.');
            }

            if (parsedBody.data.decision === 'accept') {
                if (team.memberIds.includes(user.uid) === false) {
                    const nextMemberIds = Array.from(new Set([...team.memberIds, user.uid]));
                    const nextMembers = team.members.some((member) => member.id === user.uid)
                        ? team.members
                        : [...team.members, currentMember];

                    transaction.update(teamRef, {
                        memberIds: nextMemberIds,
                        members: nextMembers,
                        pendingInviteDoctorIds: team.pendingInviteDoctorIds.filter((doctorId) => doctorId !== user.uid),
                        updatedAt: new Date()
                    });
                }
            } else {
                transaction.update(teamRef, {
                    pendingInviteDoctorIds: team.pendingInviteDoctorIds.filter((doctorId) => doctorId !== user.uid),
                    updatedAt: new Date()
                });
            }

            transaction.update(inviteSnapshot.ref, {
                actionStatus: parsedBody.data.decision === 'accept' ? 'accepted' : 'rejected',
                read: true,
                respondedAt: new Date(),
                updatedAt: new Date()
            });
        });

        if (inviterId && inviterId !== user.uid) {
            const teamDoc = await db.collection('teams').doc(teamId).get();
            const team = mapTeamSnapshot(teamDoc);
            if (team) {
                const decisionLabel = parsedBody.data.decision === 'accept' ? 'accepted' : 'declined';
                await createNotification({
                    recipientId: inviterId,
                    actorId: user.uid,
                    actorName: currentMember.name,
                    type: 'team_invite_response',
                    title: `Team invite ${decisionLabel}`,
                    body: `${currentMember.name} ${decisionLabel} your invitation to join ${team.name}.`,
                    href: '/team',
                    metadata: {
                        teamId,
                        decision: parsedBody.data.decision,
                        responderId: user.uid
                    }
                });
            }
        }

        return NextResponse.json({
            success: true,
            decision: parsedBody.data.decision
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Notification response API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
