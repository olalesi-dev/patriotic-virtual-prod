import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { loadProviderScopedPatientDetail } from '@/lib/server-patients';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';

export async function resolveProviderScopedPatientDetail(request: Request, patientId: string) {
    const { user, errorResponse } = await requireAuthenticatedUser(request, { resolveRole: false });
    if (errorResponse) {
        return { patient: null, errorResponse };
    }
    if (!user) {
        return {
            patient: null,
            errorResponse: NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 })
        };
    }

    const providerAccessError = ensureProviderAccess(user);
    if (providerAccessError) {
        return { patient: null, errorResponse: providerAccessError };
    }

    if (!db) {
        return {
            patient: null,
            errorResponse: NextResponse.json(
                { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
                { status: 500 }
            )
        };
    }

    const firestore = db;
    const userDoc = await firestore.collection('users').doc(user.uid).get();
    const role = normalizeRole(user.token.role ?? userDoc.data()?.role ?? user.role);
    const resolvedAccessError = ensureProviderAccess(user, role);
    if (resolvedAccessError) {
        return { patient: null, errorResponse: resolvedAccessError };
    }

    const patient = await loadProviderScopedPatientDetail(firestore, user.uid, patientId);
    if (!patient) {
        return {
            patient: null,
            errorResponse: NextResponse.json({ success: false, error: 'Patient not found.' }, { status: 404 })
        };
    }

    return {
        patient,
        errorResponse: null
    };
}
