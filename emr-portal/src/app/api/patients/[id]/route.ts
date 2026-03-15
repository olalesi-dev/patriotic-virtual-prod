import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { loadProviderScopedPatientDetail } from '@/lib/server-patients';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => asNonEmptyString(entry))
        .filter((entry): entry is string => Boolean(entry));
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
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
        const firestore = db;
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        const role = normalizeRole(user.token.role ?? userDoc.data()?.role ?? user.role);
        const resolvedAccessError = ensureProviderAccess(user, role);
        if (resolvedAccessError) return resolvedAccessError;

        const patient = await loadProviderScopedPatientDetail(firestore, user.uid, params.id);
        if (!patient) {
            return NextResponse.json({ success: false, error: 'Patient not found.' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            patient
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Patient detail API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
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
        const firestore = db;
        const patient = await loadProviderScopedPatientDetail(firestore, user.uid, params.id);
        if (!patient) {
            return NextResponse.json({ success: false, error: 'Patient not found.' }, { status: 404 });
        }

        const payload = await request.json() as {
            action?: string;
            values?: Record<string, unknown>;
        };
        const action = asNonEmptyString(payload.action);
        const values = payload.values ?? {};
        const patientRef = firestore.collection('patients').doc(params.id);

        if (action === 'update_demographics') {
            const firstName = asNonEmptyString(values.firstName);
            const lastName = asNonEmptyString(values.lastName);
            const displayName = [firstName, lastName].filter(Boolean).join(' ');
            const nextPatientData = {
                ...(displayName ? { name: displayName, displayName, firstName, lastName } : {}),
                ...(asNonEmptyString(values.email) ? { email: asNonEmptyString(values.email) } : {}),
                ...(asNonEmptyString(values.phone) ? { phone: asNonEmptyString(values.phone) } : {}),
                ...(asNonEmptyString(values.dob) ? { dob: asNonEmptyString(values.dob) } : {}),
                ...(asNonEmptyString(values.sex) ? { sex: asNonEmptyString(values.sex), sexAtBirth: asNonEmptyString(values.sex) } : {}),
                ...(asNonEmptyString(values.state) ? { state: asNonEmptyString(values.state) } : {}),
                ...(asNonEmptyString(values.primaryConcern) ? { primaryConcern: asNonEmptyString(values.primaryConcern) } : {}),
                ...(asNonEmptyString(values.preferredPharmacy) ? { preferredPharmacy: asNonEmptyString(values.preferredPharmacy) } : {}),
                ...(Array.isArray(values.allergies) ? { allergies: asStringArray(values.allergies) } : {}),
                updatedAt: new Date()
            };

            await patientRef.set(nextPatientData, { merge: true });
            await firestore.collection('users').doc(params.id).set({
                ...(displayName ? { displayName, name: displayName, firstName, lastName } : {}),
                ...(asNonEmptyString(values.email) ? { email: asNonEmptyString(values.email) } : {}),
                ...(asNonEmptyString(values.phone) ? { phone: asNonEmptyString(values.phone) } : {}),
                updatedAt: new Date()
            }, { merge: true });
        } else if (action === 'add_problem') {
            const description = asNonEmptyString(values.description);
            if (!description) {
                return NextResponse.json({ success: false, error: 'Problem description is required.' }, { status: 400 });
            }

            await patientRef.collection('problems').add({
                code: asNonEmptyString(values.code) ?? 'DX',
                description,
                createdAt: new Date(),
                updatedAt: new Date(),
                providerId: user.uid
            });
        } else if (action === 'add_medication') {
            const name = asNonEmptyString(values.name);
            if (!name) {
                return NextResponse.json({ success: false, error: 'Medication name is required.' }, { status: 400 });
            }

            await patientRef.collection('medications').add({
                name,
                dosage: asNonEmptyString(values.dosage) ?? 'N/A',
                frequency: asNonEmptyString(values.frequency) ?? 'Unspecified',
                route: asNonEmptyString(values.route),
                status: asNonEmptyString(values.status) ?? 'Active',
                startDate: asNonEmptyString(values.startDate) ?? new Date().toISOString().slice(0, 10),
                createdAt: new Date(),
                updatedAt: new Date(),
                providerId: user.uid
            });
        } else {
            return NextResponse.json({ success: false, error: 'Unsupported patient update action.' }, { status: 400 });
        }

        const refreshedPatient = await loadProviderScopedPatientDetail(firestore, user.uid, params.id);
        return NextResponse.json({
            success: true,
            patient: refreshedPatient
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Patient detail update API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
