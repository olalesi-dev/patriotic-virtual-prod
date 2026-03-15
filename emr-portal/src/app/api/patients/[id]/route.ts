import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { loadProviderScopedPatientDetail, loadProviderScopedPatientSummary } from '@/lib/server-patients';
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

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
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
        const patientSummary = await loadProviderScopedPatientSummary(firestore, user.uid, params.id);
        if (!patientSummary) {
            return NextResponse.json({ success: false, error: 'Patient not found.' }, { status: 404 });
        }

        const payload = await request.json() as {
            action?: string;
            values?: Record<string, unknown>;
        };
        const action = asNonEmptyString(payload.action);
        const values = payload.values ?? {};
        const patientRef = firestore.collection('patients').doc(params.id);
        const now = new Date();

        if (action === 'update_demographics') {
            const firstName = asNonEmptyString(values.firstName);
            const lastName = asNonEmptyString(values.lastName);
            const displayName = [firstName, lastName].filter(Boolean).join(' ');
            const sex = asNonEmptyString(values.sex);
            const nextPatientData = {
                ...(displayName ? { name: displayName, displayName, firstName, lastName } : {}),
                ...(asNonEmptyString(values.email) ? { email: asNonEmptyString(values.email) } : {}),
                ...(asNonEmptyString(values.phone) ? { phone: asNonEmptyString(values.phone) } : {}),
                ...(asNonEmptyString(values.dob) ? { dob: asNonEmptyString(values.dob) } : {}),
                ...(sex ? { sex, sexAtBirth: sex, gender: sex } : {}),
                ...(asNonEmptyString(values.state) ? { state: asNonEmptyString(values.state) } : {}),
                ...(asNonEmptyString(values.primaryConcern) ? { primaryConcern: asNonEmptyString(values.primaryConcern) } : {}),
                ...(asNonEmptyString(values.preferredPharmacy) ? { preferredPharmacy: asNonEmptyString(values.preferredPharmacy) } : {}),
                ...(Array.isArray(values.allergies) ? { allergies: asStringArray(values.allergies) } : {}),
                updatedAt: now
            };

            await patientRef.set(nextPatientData, { merge: true });
            await firestore.collection('users').doc(params.id).set({
                ...(displayName ? { displayName, name: displayName, firstName, lastName } : {}),
                ...(asNonEmptyString(values.email) ? { email: asNonEmptyString(values.email) } : {}),
                ...(asNonEmptyString(values.phone) ? { phone: asNonEmptyString(values.phone) } : {}),
                ...(sex ? { sex, sexAtBirth: sex, gender: sex } : {}),
                updatedAt: now
            }, { merge: true });
        } else if (action === 'add_problem') {
            const description = asNonEmptyString(values.description);
            if (!description) {
                return NextResponse.json({ success: false, error: 'Problem description is required.' }, { status: 400 });
            }

            await patientRef.collection('problems').add({
                code: asNonEmptyString(values.code) ?? 'DX',
                description,
                createdAt: now,
                updatedAt: now,
                providerId: user.uid
            });
        } else if (action === 'update_problem') {
            const recordId = asNonEmptyString(values.id);
            const description = asNonEmptyString(values.description);
            if (!recordId || !description) {
                return NextResponse.json({ success: false, error: 'Problem id and description are required.' }, { status: 400 });
            }

            await patientRef.collection('problems').doc(recordId).set({
                code: asNonEmptyString(values.code) ?? 'DX',
                description,
                updatedAt: now,
                providerId: user.uid
            }, { merge: true });
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
                startDate: asNonEmptyString(values.startDate) ?? now.toISOString().slice(0, 10),
                createdAt: now,
                updatedAt: now,
                providerId: user.uid
            });
        } else if (action === 'update_medication') {
            const recordId = asNonEmptyString(values.id);
            const name = asNonEmptyString(values.name);
            if (!recordId || !name) {
                return NextResponse.json({ success: false, error: 'Medication id and name are required.' }, { status: 400 });
            }

            await patientRef.collection('medications').doc(recordId).set({
                name,
                dosage: asNonEmptyString(values.dosage) ?? 'N/A',
                frequency: asNonEmptyString(values.frequency) ?? 'Unspecified',
                route: asNonEmptyString(values.route),
                status: asNonEmptyString(values.status) ?? 'Active',
                startDate: asNonEmptyString(values.startDate) ?? now.toISOString().slice(0, 10),
                updatedAt: now,
                providerId: user.uid
            }, { merge: true });
        } else if (action === 'add_order') {
            const description = asNonEmptyString(values.description);
            if (!description) {
                return NextResponse.json({ success: false, error: 'Order description is required.' }, { status: 400 });
            }

            await patientRef.collection('orders').add({
                type: asNonEmptyString(values.type) ?? 'lab',
                description,
                status: asNonEmptyString(values.status) ?? 'Ordered',
                orderedAt: asNonEmptyString(values.orderedAt) ?? now.toISOString().slice(0, 10),
                scheduledFor: asNonEmptyString(values.scheduledFor),
                tests: asStringArray(values.tests),
                notes: asNonEmptyString(values.notes),
                provider: user.email ?? 'Provider',
                providerId: user.uid,
                createdAt: now,
                updatedAt: now
            });
        } else if (action === 'add_imaging') {
            const modality = asNonEmptyString(values.modality);
            if (!modality) {
                return NextResponse.json({ success: false, error: 'Imaging modality is required.' }, { status: 400 });
            }

            await patientRef.collection('imaging').add({
                modality,
                bodyPart: asNonEmptyString(values.bodyPart) ?? 'Unknown',
                status: asNonEmptyString(values.status) ?? 'Ordered',
                date: asNonEmptyString(values.date) ?? now.toISOString().slice(0, 10),
                facility: asNonEmptyString(values.facility),
                provider: user.email ?? 'Provider',
                providerId: user.uid,
                reportText: asNonEmptyString(values.reportText),
                viewerUrl: asNonEmptyString(values.viewerUrl),
                createdAt: now,
                updatedAt: now
            });
        } else if (action === 'add_observation') {
            const name = asNonEmptyString(values.name);
            const value = asNonEmptyString(values.value);
            if (!name || !value) {
                return NextResponse.json({ success: false, error: 'Observation name and value are required.' }, { status: 400 });
            }

            await patientRef.collection('observations').add({
                category: asNonEmptyString(values.category) === 'vital' ? 'vital' : 'lab',
                name,
                value,
                unit: asNonEmptyString(values.unit),
                referenceRange: asNonEmptyString(values.referenceRange),
                status: asNonEmptyString(values.status) ?? 'Recorded',
                notes: asNonEmptyString(values.notes),
                date: asNonEmptyString(values.date) ?? now.toISOString().slice(0, 10),
                providerId: user.uid,
                createdAt: now,
                updatedAt: now
            });
        } else if (action === 'add_document') {
            const name = asNonEmptyString(values.name);
            if (!name) {
                return NextResponse.json({ success: false, error: 'Document name is required.' }, { status: 400 });
            }

            await patientRef.collection('documents').add({
                name,
                category: asNonEmptyString(values.category) ?? 'Other',
                status: asNonEmptyString(values.status) ?? 'Available',
                date: asNonEmptyString(values.date) ?? now.toISOString().slice(0, 10),
                type: asNonEmptyString(values.type) ?? 'File',
                url: asNonEmptyString(values.url),
                size: asNonEmptyString(values.size),
                providerId: user.uid,
                createdAt: now,
                updatedAt: now
            });
        } else if (action === 'send_message') {
            const text = asNonEmptyString(values.text);
            if (!text) {
                return NextResponse.json({ success: false, error: 'Message text is required.' }, { status: 400 });
            }

            const threadQuery = await firestore
                .collection('threads')
                .where('providerId', '==', user.uid)
                .where('patientId', '==', params.id)
                .limit(1)
                .get();

            const patientName = patientSummary.name;
            const threadRef = threadQuery.docs[0]?.ref ?? firestore.collection('threads').doc();

            if (!threadQuery.docs[0]) {
                await threadRef.set({
                    patientId: params.id,
                    patientName,
                    providerId: user.uid,
                    providerName: user.email ?? 'Provider',
                    subject: 'Patient conversation',
                    category: 'Clinical',
                    lastMessage: text,
                    lastMessageAt: now,
                    updatedAt: now,
                    unreadCount: 0
                });
            } else {
                await threadRef.set({
                    lastMessage: text,
                    lastMessageAt: now,
                    updatedAt: now
                }, { merge: true });
            }

            await threadRef.collection('messages').add({
                senderId: user.uid,
                senderType: 'provider',
                senderName: user.email ?? 'Provider',
                body: text,
                createdAt: now,
                read: true
            });
        } else if (action === 'add_billing_statement') {
            const amount = asNumber(values.amount);
            const description = asNonEmptyString(values.description);
            if (amount === null || !description) {
                return NextResponse.json({ success: false, error: 'Billing amount and description are required.' }, { status: 400 });
            }

            const summaryRef = patientRef.collection('billing').doc('summary');
            await summaryRef.set({
                balance: amount,
                status: asNonEmptyString(values.status) ?? 'pending',
                nextBillingDate: asNonEmptyString(values.nextBillingDate),
                membershipPlan: asNonEmptyString(values.membershipPlan),
                updatedAt: now
            }, { merge: true });

            await summaryRef.collection('statements').add({
                date: asNonEmptyString(values.date) ?? now.toISOString().slice(0, 10),
                amount,
                status: asNonEmptyString(values.status) ?? 'pending',
                items: [{
                    description,
                    amount
                }],
                createdAt: now,
                updatedAt: now
            });
        } else {
            return NextResponse.json({ success: false, error: 'Unsupported patient update action.' }, { status: 400 });
        }

        return NextResponse.json({
            success: true
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
