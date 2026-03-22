import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { ensureProviderAccess, requireAuthenticatedUser } from '@/lib/server-auth';
import { mapTeamSnapshot, mapUserDocToMember, toProviderRole } from '@/lib/server-teams';
import type { PatientSummary, ProviderSummary } from '@/lib/team-types';

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

function normalizePatientSummaries(
    patientDocs: Array<{ id: string; data: Record<string, unknown> }>,
    userPatientDocs: Array<{ id: string; data: Record<string, unknown> }>
): PatientSummary[] {
    const map = new Map<string, PatientSummary>();

    const push = (id: string, data: Record<string, unknown>) => {
        const current = map.get(id);
        const name = asNonEmptyString(data.name)
            ?? asNonEmptyString(data.displayName)
            ?? [asNonEmptyString(data.firstName), asNonEmptyString(data.lastName)].filter(Boolean).join(' ')
            ?? asNonEmptyString(data.email)?.split('@')[0]
            ?? `Patient ${id.slice(0, 6)}`;

        map.set(id, {
            id,
            name,
            email: asNonEmptyString(data.email) ?? current?.email ?? null,
            teamId: asNonEmptyString(data.teamId) ?? current?.teamId ?? null
        });
    };

    patientDocs.forEach((doc) => push(doc.id, doc.data));
    userPatientDocs.forEach((doc) => push(doc.id, doc.data));

    return Array.from(map.values()).sort((first, second) => first.name.localeCompare(second.name));
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
        const [userDoc, teamSnapshot, providersSnapshot, patientsSnapshot, patientUsersSnapshot] = await Promise.all([
            firestore.collection('users').doc(user.uid).get(),
            firestore.collection('teams').where('memberIds', 'array-contains', user.uid).get(),
            firestore.collection('users').where('role', 'in', ['provider', 'doctor', 'clinician', 'admin']).limit(200).get(),
            firestore.collection('patients').limit(200).get(),
            firestore.collection('users').where('role', '==', 'patient').limit(200).get()
        ]);

        const role = toProviderRole(user.token.role ?? userDoc.data()?.role ?? user.role);
        if (!role) {
            return NextResponse.json({ success: false, error: 'Provider access required.' }, { status: 403 });
        }

        const teams = teamSnapshot.docs
            .map((teamDoc) => mapTeamSnapshot(teamDoc))
            .filter((team): team is NonNullable<typeof team> => Boolean(team))
            .sort((first, second) => first.name.localeCompare(second.name));

        const providers: ProviderSummary[] = providersSnapshot.docs.reduce<ProviderSummary[]>((accumulator, providerDoc) => {
            const data = providerDoc.data() as Record<string, unknown>;
            const providerRole = toProviderRole(data.role);
            if (!providerRole) return accumulator;

            accumulator.push({
                id: providerDoc.id,
                name: asNonEmptyString(data.name)
                    ?? asNonEmptyString(data.displayName)
                    ?? [asNonEmptyString(data.firstName), asNonEmptyString(data.lastName)].filter(Boolean).join(' ')
                    ?? asNonEmptyString(data.email)?.split('@')[0]
                    ?? `Provider ${providerDoc.id.slice(0, 6)}`,
                email: asNonEmptyString(data.email),
                role: providerRole
            });

            return accumulator;
        }, []).sort((first, second) => first.name.localeCompare(second.name));

        const patients = normalizePatientSummaries(
            patientsSnapshot.docs.map((patientDoc) => ({ id: patientDoc.id, data: patientDoc.data() as Record<string, unknown> })),
            patientUsersSnapshot.docs.map((patientDoc) => ({ id: patientDoc.id, data: patientDoc.data() as Record<string, unknown> }))
        );

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

        const userDoc = await firestore.collection('users').doc(user.uid).get();
        const member = mapUserDocToMember(userDoc) ?? {
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
