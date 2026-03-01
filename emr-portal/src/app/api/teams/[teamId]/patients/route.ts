import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { ensureProviderAccess, requireAuthenticatedUser } from '@/lib/server-auth';
import { createNotification } from '@/lib/server-notifications';
import { mapTeamSnapshot } from '@/lib/server-teams';

export const dynamic = 'force-dynamic';

const assignPatientSchema = z.object({
    patientId: z.string().trim().min(1)
});

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function resolveDisplayName(value: Record<string, unknown> | undefined): string | null {
    const directName = asNonEmptyString(value?.name) ?? asNonEmptyString(value?.displayName);
    if (directName) return directName;

    const firstName = asNonEmptyString(value?.firstName);
    const lastName = asNonEmptyString(value?.lastName);
    if (firstName && lastName) return `${firstName} ${lastName}`;
    return firstName ?? lastName ?? null;
}

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
        const parsedBody = assignPatientSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid patient assignment payload.' }, { status: 400 });
        }

        const teamId = params.teamId;
        if (!teamId) {
            return NextResponse.json({ success: false, error: 'Team id is required.' }, { status: 400 });
        }

        const patientId = parsedBody.data.patientId;

        let shouldNotifyPatientAssignment = false;
        let assignedTeamName: string | null = null;

        await db.runTransaction(async (transaction) => {
            const teamRef = db!.collection('teams').doc(teamId);
            const patientRef = db!.collection('patients').doc(patientId);
            const userPatientRef = db!.collection('users').doc(patientId);
            const teamMembershipQuery = db!.collection('teams').where('patientIds', 'array-contains', patientId);

            const [teamDoc, patientDoc, patientUserDoc, teamMembershipSnapshot] = await Promise.all([
                transaction.get(teamRef),
                transaction.get(patientRef),
                transaction.get(userPatientRef),
                transaction.get(teamMembershipQuery)
            ]);

            const team = mapTeamSnapshot(teamDoc);
            if (!team) {
                throw new Error('Team not found.');
            }

            if (!team.memberIds.includes(user.uid)) {
                throw new Error('Only team members can assign patients to this team.');
            }

            const patientData = (
                patientDoc.exists
                    ? patientDoc.data()
                    : (patientUserDoc.exists ? patientUserDoc.data() : {})
            ) as Record<string, unknown>;
            const previousTeamId = asNonEmptyString(patientData.teamId);
            const isAlreadyInTargetTeam = team.patientIds.includes(patientId);
            const wasInDifferentTeam = teamMembershipSnapshot.docs.some((membershipDoc) => membershipDoc.id !== teamId);
            shouldNotifyPatientAssignment = !isAlreadyInTargetTeam || wasInDifferentTeam || (previousTeamId !== null && previousTeamId !== teamId);
            assignedTeamName = team.name;

            teamMembershipSnapshot.docs.forEach((membershipDoc) => {
                if (membershipDoc.id === teamId) return;
                const membershipTeam = mapTeamSnapshot(membershipDoc);
                if (!membershipTeam) return;
                if (!membershipTeam.patientIds.includes(patientId)) return;

                transaction.update(membershipDoc.ref, {
                    patientIds: membershipTeam.patientIds.filter((id) => id !== patientId),
                    updatedAt: new Date()
                });
            });

            const nextPatientIds = Array.from(new Set([...team.patientIds, patientId]));
            transaction.update(teamRef, {
                patientIds: nextPatientIds,
                updatedAt: new Date()
            });

            transaction.set(patientRef, {
                teamId,
                updatedAt: new Date()
            }, { merge: true });

            transaction.set(userPatientRef, {
                teamId,
                updatedAt: new Date()
            }, { merge: true });
        });

        if (shouldNotifyPatientAssignment) {
            const actorDoc = await db.collection('users').doc(user.uid).get();

            const actorData = actorDoc.exists
                ? actorDoc.data() as Record<string, unknown>
                : undefined;
            const actorName = resolveDisplayName(actorData)
                ?? user.email?.split('@')[0]
                ?? 'Care Team';

            try {
                await createNotification({
                    recipientId: patientId,
                    actorId: user.uid,
                    actorName,
                    type: 'team_patient_assigned',
                    title: `Care team assigned`,
                    body: `${actorName} assigned you to ${assignedTeamName ?? 'a care team'}.`,
                    href: '/patient',
                    metadata: {
                        teamId,
                        teamName: assignedTeamName,
                        patientId
                    }
                });
            } catch (notificationError) {
                console.warn('Assign patient notification skipped:', notificationError);
            }
        }

        return NextResponse.json({ success: true, teamId, patientId });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Assign patient team API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(
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
        const parsedBody = assignPatientSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid patient assignment payload.' }, { status: 400 });
        }

        const teamId = params.teamId;
        const patientId = parsedBody.data.patientId;
        if (!teamId) {
            return NextResponse.json({ success: false, error: 'Team id is required.' }, { status: 400 });
        }

        const teamRef = db.collection('teams').doc(teamId);
        const patientRef = db.collection('patients').doc(patientId);
        const userPatientRef = db.collection('users').doc(patientId);

        await db.runTransaction(async (transaction) => {
            const [teamDoc, patientDoc, patientUserDoc] = await Promise.all([
                transaction.get(teamRef),
                transaction.get(patientRef),
                transaction.get(userPatientRef)
            ]);

            const team = mapTeamSnapshot(teamDoc);
            if (!team) {
                throw new Error('Team not found.');
            }

            if (!team.memberIds.includes(user.uid)) {
                throw new Error('Only team members can unassign patients.');
            }

            transaction.update(teamRef, {
                patientIds: team.patientIds.filter((id) => id !== patientId),
                updatedAt: new Date()
            });

            if (patientDoc.exists) {
                const patientData = patientDoc.data() as Record<string, unknown>;
                if (asNonEmptyString(patientData.teamId) === teamId) {
                    transaction.set(patientRef, {
                        teamId: null,
                        updatedAt: new Date()
                    }, { merge: true });
                }
            }

            if (patientUserDoc.exists) {
                const patientUserData = patientUserDoc.data() as Record<string, unknown>;
                if (asNonEmptyString(patientUserData.teamId) === teamId) {
                    transaction.set(userPatientRef, {
                        teamId: null,
                        updatedAt: new Date()
                    }, { merge: true });
                }
            }
        });

        return NextResponse.json({ success: true, teamId, patientId });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Unassign patient team API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
