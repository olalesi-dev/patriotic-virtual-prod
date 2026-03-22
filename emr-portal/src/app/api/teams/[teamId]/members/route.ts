import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { createNotification } from '@/lib/server-notifications';
import { mapTeamSnapshot, mapUserDocToMember, toProviderRole } from '@/lib/server-teams';
import { ensureProviderAccess, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const addMemberSchema = z.object({
    doctorId: z.string().trim().min(1)
});

export async function POST(
    request: Request,
    { params }: { params: { teamId: string } }
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
        const parsedBody = addMemberSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid member payload.' }, { status: 400 });
        }

        const teamId = params.teamId;
        if (!teamId) {
            return NextResponse.json({ success: false, error: 'Team id is required.' }, { status: 400 });
        }

        const [teamDoc, targetDoctorDoc, actorDoc] = await Promise.all([
            db.collection('teams').doc(teamId).get(),
            db.collection('users').doc(parsedBody.data.doctorId).get(),
            db.collection('users').doc(user.uid).get()
        ]);

        const team = mapTeamSnapshot(teamDoc);
        if (!team) {
            return NextResponse.json({ success: false, error: 'Team not found.' }, { status: 404 });
        }

        if (team.ownerId !== user.uid) {
            return NextResponse.json({ success: false, error: 'Only team owner can add members directly.' }, { status: 403 });
        }

        const targetDoctor = mapUserDocToMember(targetDoctorDoc);
        if (!targetDoctor || !toProviderRole(targetDoctor.role)) {
            return NextResponse.json({ success: false, error: 'Selected user is not a provider.' }, { status: 400 });
        }

        if (team.memberIds.includes(targetDoctor.id)) {
            return NextResponse.json({ success: false, error: 'Doctor is already a team member.' }, { status: 409 });
        }

        const nextMemberIds = Array.from(new Set([...team.memberIds, targetDoctor.id]));
        const nextMembers = [...team.members, targetDoctor];

        await db.collection('teams').doc(teamId).update({
            memberIds: nextMemberIds,
            members: nextMembers,
            pendingInviteDoctorIds: team.pendingInviteDoctorIds.filter((doctorId) => doctorId !== targetDoctor.id),
            updatedAt: new Date()
        });

        const actor = mapUserDocToMember(actorDoc) ?? {
            id: user.uid,
            name: user.email?.split('@')[0] ?? 'Provider',
            email: user.email,
            role: toProviderRole(user.role) ?? 'provider'
        };

        await createNotification({
            recipientId: targetDoctor.id,
            actorId: actor.id,
            actorName: actor.name,
            type: 'team_invite_response',
            title: `Added to ${team.name}`,
            body: `${actor.name} added you to ${team.name}.`,
            href: '/team',
            metadata: {
                teamId,
                teamName: team.name,
                action: 'added_directly'
            }
        });

        const updatedTeamDoc = await db.collection('teams').doc(teamId).get();
        const updatedTeam = mapTeamSnapshot(updatedTeamDoc);

        return NextResponse.json({
            success: true,
            team: updatedTeam
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Add team member API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
