import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { loadProviderScopedPatients } from '@/lib/server-patients';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

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
        const query = searchParams.get('q') ?? '';
        const payload = await loadProviderScopedPatients(firestore, user.uid, {
            query,
            pageSize: Math.min(Number(searchParams.get('limit') ?? '20') || 20, 50),
            sortField: 'name',
            sortDir: 'asc'
        });

        return NextResponse.json({
            success: true,
            query: { q: query, field: searchParams.get('field') ?? 'all' },
            results: payload.patients
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Patient search API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
