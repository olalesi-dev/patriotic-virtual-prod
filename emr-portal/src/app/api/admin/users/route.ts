import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import {
    adminCreateUserSchema,
    buildAdminUserProfileFields
} from '@/lib/dosespot-clinician-profile';

export const dynamic = 'force-dynamic';

async function triggerBackgroundDoseSpotSync(clinicianUid: string) {
    const backendUrl = (
        process.env.DOSESPOT_BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL
    )?.trim();
    const internalSecret = process.env.DOSESPOT_SECRET_KEY?.trim();

    if (!backendUrl || !internalSecret) {
        console.warn('[Admin Users] Skipping background DoseSpot sync due to missing backend URL or internal secret', {
            clinicianUid,
            hasBackendUrl: Boolean(backendUrl),
            hasInternalSecret: Boolean(internalSecret)
        });
        return;
    }

    try {
        const response = await fetch(`${backendUrl.replace(/\/$/, '')}/api/v1/dosespot/clinicians/internal-sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-dosespot-secret': internalSecret
            },
            body: JSON.stringify({ clinicianUid }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Admin Users] Background DoseSpot sync failed', {
                clinicianUid,
                status: response.status,
                error: errorText
            });
        }
    } catch (error) {
        console.error('[Admin Users] Background DoseSpot sync request failed', {
            clinicianUid,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

export async function GET() {
    try {
        if (!auth || !db) {
            throw new Error('Firebase Admin not initialized');
        }
        // List users (limit to 100 for now)
        const listUsersResult = await auth!.listUsers(100);

        // Fetch profiles from Firestore to get roles
        const users = await Promise.all(listUsersResult.users.map(async (userRecord) => {
            const [userDoc, patientDoc] = await Promise.all([
                db!.collection('users').doc(userRecord.uid).get(),
                db!.collection('patients').doc(userRecord.uid).get()
            ]);
            const userData = userDoc.data();
            const patientData = patientDoc.data();
            const merged = { ...(patientData ?? {}), ...(userData ?? {}) } as Record<string, unknown>;

            return {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName || merged.displayName || merged.name || 'Unknown',
                role: merged.role || 'patient',
                disabled: userRecord.disabled,
                lastSignInTime: userRecord.metadata.lastSignInTime,
                creationTime: userRecord.metadata.creationTime,
            };
        }));

        return NextResponse.json({ success: true, users });
    } catch (error: any) {
        console.error('Error listing users:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        if (!auth || !db) {
            throw new Error('Firebase Admin not initialized');
        }
        const parsedBody = adminCreateUserSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            const message = parsedBody.error.issues[0]?.message || 'Invalid user payload.';
            return NextResponse.json({ success: false, error: message }, { status: 400 });
        }
        const payload = parsedBody.data;
        const displayName = `${payload.firstName} ${payload.lastName}`.trim();

        // Create user in Auth
        const userRecord = await auth!.createUser({
            email: payload.email,
            password: payload.password,
            displayName,
        });

        const profile = buildAdminUserProfileFields(payload, {
            uid: userRecord.uid,
            includeCreatedAt: true
        });

        await Promise.all([
            db!.collection('patients').doc(userRecord.uid).set(profile, { merge: true }),
            db!.collection('users').doc(userRecord.uid).set(profile, { merge: true })
        ]);

        // Also set custom claims for security rules if needed
        await auth!.setCustomUserClaims(userRecord.uid, { role: payload.role });

        if (payload.role === 'provider') {
            void triggerBackgroundDoseSpotSync(userRecord.uid);
        }

        return NextResponse.json({
            success: true,
            message: 'User created successfully',
            uid: userRecord.uid,
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                role: payload.role,
                syncQueued: payload.role === 'provider'
            }
        });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
