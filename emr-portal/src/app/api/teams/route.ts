import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';
import {
    buildTeamRepairPatch,
    loadMergedUserRecord,
    loadMergedUserRecords,
    mapTeamSnapshot,
    mapUserRecordToMember,
    mapUserRecordToPatientSummary,
    mapUserRecordToProviderSummary,
    toProviderRole
} from '@/lib/server-teams';

export const dynamic = 'force-dynamic';

const createTeamSchema = z.object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(220).optional()
});

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

export async function GET(request: Request) {
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
        const [mergedCurrentUser, ownerTeamsSnapshot, memberTeamsSnapshot, mergedUserRecords] = await Promise.all([
            loadMergedUserRecord(firestore, user.uid),
            firestore.collection('teams').where('ownerId', '==', user.uid).get(),
            firestore.collection('teams').where('memberIds', 'array-contains', user.uid).get(),
            loadMergedUserRecords(firestore, 500)
        ]);

        const effectiveRole = normalizeRole(
            user.token.role ??
            mergedCurrentUser?.role ??
            user.role
        );
        const resolvedProviderAccessError = ensureProviderAccess(user, effectiveRole);
        if (resolvedProviderAccessError) return resolvedProviderAccessError;

        const uniqueTeamDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
        ownerTeamsSnapshot.docs.forEach((doc) => uniqueTeamDocs.set(doc.id, doc));
        memberTeamsSnapshot.docs.forEach((doc) => uniqueTeamDocs.set(doc.id, doc));

        const teamDocs = Array.from(uniqueTeamDocs.values());
        const teams = teamDocs
            .map((teamDoc) => mapTeamSnapshot(teamDoc))
            .filter((team): team is NonNullable<typeof team> => Boolean(team))
            .sort((first, second) => first.name.localeCompare(second.name));

        const teamRepairWrites = teamDocs.map((teamDoc) => {
            const normalizedTeam = mapTeamSnapshot(teamDoc);
            if (!normalizedTeam) return null;
            const patch = buildTeamRepairPatch(teamDoc, normalizedTeam);
            if (!patch) return null;
            return teamDoc.ref.set(patch, { merge: true });
        }).filter((write): write is Promise<FirebaseFirestore.WriteResult> => Boolean(write));

        if (teamRepairWrites.length > 0) {
            await Promise.all(teamRepairWrites);
        }

        const providers = mergedUserRecords
            .map((record) => mapUserRecordToProviderSummary(record.id, record.data))
            .filter((provider): provider is NonNullable<typeof provider> => Boolean(provider))
            .sort((first, second) => first.name.localeCompare(second.name));

        const providerIds = new Set(providers.map((provider) => provider.id));
        const patients = mergedUserRecords
            .map((record) => mapUserRecordToPatientSummary(record.id, record.data))
            .filter((patient): patient is NonNullable<typeof patient> => Boolean(patient))
            .filter((patient) => !providerIds.has(patient.id))
            .sort((first, second) => first.name.localeCompare(second.name));

        return NextResponse.json({
            success: true,
            teams,
            providers,
            patients
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Teams API list error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
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
        const parsedBody = createTeamSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid team payload.' }, { status: 400 });
        }

        const mergedCurrentUser = await loadMergedUserRecord(firestore, user.uid);
        const member = mapUserRecordToMember(user.uid, mergedCurrentUser ?? undefined) ?? {
            id: user.uid,
            name: user.email?.split('@')[0] ?? 'Provider',
            email: user.email,
            role: toProviderRole(user.role) ?? 'provider'
        };

        const now = new Date();
        const teamRef = firestore.collection('teams').doc();
        await teamRef.set({
            name: parsedBody.data.name.trim(),
            description: asNonEmptyString(parsedBody.data.description ?? ''),
            ownerId: user.uid,
            ownerName: member.name,
            memberIds: [user.uid],
            members: [member],
            patientIds: [],
            pendingInviteDoctorIds: [],
            createdAt: now,
            updatedAt: now
        });

        const createdTeam = await teamRef.get();
        const normalized = mapTeamSnapshot(createdTeam);

        return NextResponse.json({
            success: true,
            team: normalized
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Teams API create error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
