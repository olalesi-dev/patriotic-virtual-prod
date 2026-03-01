import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { ensureProviderAccess, requireAuthenticatedUser } from '@/lib/server-auth';
import { mapTeamSnapshot } from '@/lib/server-teams';
import { getRandomTeamColor, normalizeTeamColor } from '@/lib/team-colors';

export const dynamic = 'force-dynamic';

const updateTeamSchema = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(220).nullable().optional(),
    color: z.string().trim().nullable().optional()
});

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

export async function PATCH(
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
    const firestore = db;

    try {
        const parsedBody = updateTeamSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid team update payload.' }, { status: 400 });
        }

        const teamId = params.teamId;
        if (!teamId) {
            return NextResponse.json({ success: false, error: 'Team id is required.' }, { status: 400 });
        }

        const teamRef = firestore.collection('teams').doc(teamId);
        const teamDoc = await teamRef.get();
        const team = mapTeamSnapshot(teamDoc);

        if (!team) {
            return NextResponse.json({ success: false, error: 'Team not found.' }, { status: 404 });
        }

        if (team.ownerId !== user.uid) {
            return NextResponse.json({ success: false, error: 'Only team owner can update team settings.' }, { status: 403 });
        }

        const updatePayload: Record<string, unknown> = {
            updatedAt: new Date()
        };

        if (parsedBody.data.name !== undefined) {
            updatePayload.name = parsedBody.data.name.trim();
        }

        if (parsedBody.data.description !== undefined) {
            updatePayload.description = parsedBody.data.description === null
                ? null
                : asNonEmptyString(parsedBody.data.description);
        }

        if (parsedBody.data.color !== undefined) {
            updatePayload.color = normalizeTeamColor(parsedBody.data.color) ?? getRandomTeamColor();
        }

        await teamRef.update(updatePayload);

        const updatedTeamDoc = await teamRef.get();
        const updatedTeam = mapTeamSnapshot(updatedTeamDoc);

        return NextResponse.json({ success: true, team: updatedTeam });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Update team API error:', error);
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
    const firestore = db;

    try {
        const teamId = params.teamId;
        if (!teamId) {
            return NextResponse.json({ success: false, error: 'Team id is required.' }, { status: 400 });
        }

        const teamRef = firestore.collection('teams').doc(teamId);
        const teamDoc = await teamRef.get();
        const team = mapTeamSnapshot(teamDoc);

        if (!team) {
            return NextResponse.json({ success: false, error: 'Team not found.' }, { status: 404 });
        }

        if (team.ownerId !== user.uid) {
            return NextResponse.json({ success: false, error: 'Only team owner can archive the team.' }, { status: 403 });
        }

        const batch = firestore.batch();
        batch.delete(teamRef);

        team.patientIds.forEach((patientId) => {
            const patientRef = firestore.collection('patients').doc(patientId);
            batch.set(patientRef, {
                teamId: null,
                updatedAt: new Date()
            }, { merge: true });
        });

        await batch.commit();

        return NextResponse.json({ success: true, teamId });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Delete team API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
