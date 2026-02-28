import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { createNotification } from '@/lib/server-notifications';
import { mapTeamSnapshot, mapUserDocToMember, toProviderRole } from '@/lib/server-teams';
import { ensureProviderAccess, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: Request,
    { params }: { params: { teamId: string; memberId: string } }
) {
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
        const teamId = params.teamId;
        const memberId = params.memberId;

        if (!teamId || !memberId) {
            return NextResponse.json({ success: false, error: 'Team id and member id are required.' }, { status: 400 });
        }

        const [teamDoc, actorDoc] = await Promise.all([
            db.collection('teams').doc(teamId).get(),
            db.collection('users').doc(user.uid).get()
        ]);

        const team = mapTeamSnapshot(teamDoc);
        if (!team) {
            return NextResponse.json({ success: false, error: 'Team not found.' }, { status: 404 });
        }

        if (team.ownerId !== user.uid) {
            return NextResponse.json({ success: false, error: 'Only team owner can remove members.' }, { status: 403 });
        }

        if (team.ownerId === memberId) {
            return NextResponse.json({ success: false, error: 'Team owner cannot be removed.' }, { status: 400 });
        }

        if (!team.memberIds.includes(memberId)) {
            return NextResponse.json({ success: false, error: 'Member is not in this team.' }, { status: 404 });
        }

        const removedMember = team.members.find((member) => member.id === memberId);
        const nextMemberIds = team.memberIds.filter((existingMemberId) => existingMemberId !== memberId);
        const nextMembers = team.members.filter((member) => member.id !== memberId);

        await db.collection('teams').doc(teamId).update({
            memberIds: nextMemberIds,
            members: nextMembers,
            pendingInviteDoctorIds: team.pendingInviteDoctorIds.filter((doctorId) => doctorId !== memberId),
            updatedAt: new Date()
        });

        if (removedMember) {
            const actor = mapUserDocToMember(actorDoc) ?? {
                id: user.uid,
                name: user.email?.split('@')[0] ?? 'Provider',
                email: user.email,
                role: toProviderRole(user.role) ?? 'provider'
            };
            await createNotification({
                recipientId: removedMember.id,
                actorId: actor.id,
                actorName: actor.name,
                type: 'team_invite_response',
                title: `Removed from ${team.name}`,
                body: `${actor.name} removed you from ${team.name}.`,
                href: '/team',
                metadata: {
                    teamId,
                    teamName: team.name,
                    action: 'removed'
                }
            });
        }

        return NextResponse.json({ success: true, teamId, memberId });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Remove team member API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
