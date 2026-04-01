import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { loadProviderScopedPatients } from '@/lib/server-patients';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

function readArray(searchParams: URLSearchParams, key: string): string[] {
    return searchParams
        .getAll(key)
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean);
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

    try {
        const firestore = db;
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        const role = normalizeRole(user.token.role ?? userDoc.data()?.role ?? user.role);
        const resolvedAccessError = ensureProviderAccess(user, role);
        if (resolvedAccessError) return resolvedAccessError;

        const { searchParams } = new URL(request.url);
        const pageSize = Number(searchParams.get('pageSize') ?? '25');
        const sortField = (searchParams.get('sortField') ?? 'name') as 'name' | 'lastActivityAt' | 'statusLabel';
        const sortDir = (searchParams.get('sortDir') ?? 'asc') as 'asc' | 'desc';

        const payload = await loadProviderScopedPatients(firestore, user.uid, {
            query: searchParams.get('q') ?? '',
            statuses: readArray(searchParams, 'status'),
            teamIds: readArray(searchParams, 'teamId'),
            tags: readArray(searchParams, 'tag'),
            excludeDoseSpotBlocked: searchParams.get('excludeDoseSpotBlocked') === 'true',
            cursor: searchParams.get('cursor'),
            pageSize: Number.isFinite(pageSize) ? pageSize : 25,
            sortField,
            sortDir
        });

        return NextResponse.json({
            success: true,
            ...payload
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Patient list API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
