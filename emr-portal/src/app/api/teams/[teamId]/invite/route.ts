import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { createNotification } from '@/lib/server-notifications';
import { mapTeamSnapshot, mapUserDocToMember, toProviderRole } from '@/lib/server-teams';
import { ensureProviderAccess, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const inviteSchema = z.object({
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
        const parsedBody = inviteSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid invitation payload.' }, { status: 400 });
        }

        const teamId = params.teamId;
        if (!teamId) {
            return NextResponse.json({ success: false, error: 'Team id is required.' }, { status: 400 });
        }

        if (parsedBody.data.doctorId === user.uid) {
            return NextResponse.json({ success: false, error: 'You are already in your own team.' }, { status: 400 });
        }

        const [teamDoc, inviterDoc, targetDoctorDoc] = await Promise.all([
            db.collection('teams').doc(teamId).get(),
            db.collection('users').doc(user.uid).get(),
            db.collection('users').doc(parsedBody.data.doctorId).get()
        ]);

        const team = mapTeamSnapshot(teamDoc);
        if (!team) {
            return NextResponse.json({ success: false, error: 'Team not found.' }, { status: 404 });
        }

        if (team.ownerId !== user.uid) {
            return NextResponse.json({ success: false, error: 'Only team owner can send invitations.' }, { status: 403 });
        }

        const targetDoctor = mapUserDocToMember(targetDoctorDoc);
        if (!targetDoctor || !toProviderRole(targetDoctor.role)) {
            return NextResponse.json({ success: false, error: 'Target user is not an eligible provider.' }, { status: 400 });
        }

        if (team.memberIds.includes(targetDoctor.id)) {
            return NextResponse.json({ success: false, error: 'Doctor is already a team member.' }, { status: 409 });
        }

        const inviter = mapUserDocToMember(inviterDoc) ?? {
            id: user.uid,
            name: user.email?.split('@')[0] ?? 'Provider',
            email: user.email,
            role: toProviderRole(user.role) ?? 'provider'
        };

        await db.collection('teams').doc(teamId).update({
            pendingInviteDoctorIds: Array.from(new Set([...team.pendingInviteDoctorIds, targetDoctor.id])),
            updatedAt: new Date()
        });

        await createNotification({
            recipientId: targetDoctor.id,
            actorId: inviter.id,
            actorName: inviter.name,
            type: 'team_invite',
            title: `Invitation to join ${team.name}`,
            body: `${inviter.name} invited you to join ${team.name}.`,
            href: '/notifications',
            metadata: {
                teamId,
                teamName: team.name,
                inviterId: inviter.id,
                inviterName: inviter.name
            },
            actionStatus: 'pending'
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
        console.error('Team invite API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
