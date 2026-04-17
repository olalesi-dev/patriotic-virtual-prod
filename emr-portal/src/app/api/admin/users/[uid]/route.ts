import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import {
    adminUpdateUserSchema,
    buildAdminUserProfileFields
} from '@/lib/dosespot-clinician-profile';

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: Request,
    { params }: { params: { uid: string } }
) {
    try {
        if (!auth || !db) {
            throw new Error('Firebase Admin not initialized');
        }
        const { uid } = params;
        const rawBody = await request.json();
        const { disabled } = rawBody as { disabled?: boolean };
        const parsedBody = adminUpdateUserSchema.safeParse(rawBody);
        const hasProfilePatch = parsedBody.success;

        const updates: any = {};
        if (hasProfilePatch) {
            const displayName = `${parsedBody.data.firstName} ${parsedBody.data.lastName}`.trim();
            updates.displayName = displayName;
            updates.email = parsedBody.data.email;
        }
        if (disabled !== undefined) updates.disabled = disabled;

        // Update Auth if needed
        if (Object.keys(updates).length > 0) {
            await auth!.updateUser(uid, updates);
        }

        const existingUserDoc = await db!.collection('users').doc(uid).get();
        const existingDoseSpot = existingUserDoc.exists
            ? {
                synced: existingUserDoc.data()?.doseSpot?.synced,
                registrationStatus: existingUserDoc.data()?.doseSpot?.registrationStatus ?? null,
                lastSyncError: existingUserDoc.data()?.doseSpot?.lastSyncError ?? null
            }
            : null;

        const firestoreUpdates: Record<string, unknown> = hasProfilePatch
            ? buildAdminUserProfileFields(parsedBody.data, {
                uid,
                disabled,
                existingDoseSpot
            })
            : {};

        if (Object.keys(firestoreUpdates).length > 0) {
            const role = String(firestoreUpdates.role || '');
            if (role) {
                await auth!.setCustomUserClaims(uid, { role });
            }

            await Promise.all([
                db!.collection('patients').doc(uid).set(firestoreUpdates, { merge: true }),
                db!.collection('users').doc(uid).set(firestoreUpdates, { merge: true })
            ]);
        } else if (!hasProfilePatch && disabled === undefined) {
            const message = parsedBody.success ? 'Nothing to update.' : (parsedBody.error.issues[0]?.message || 'Invalid user payload.');
            return NextResponse.json({ success: false, error: message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'User updated successfully' });
    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { uid: string } }
) {
    try {
        if (!auth || !db) {
            throw new Error('Firebase Admin not initialized');
        }
        const { uid } = params;

        // Delete from Auth
        await auth!.deleteUser(uid);

        // Delete from Firestore
        await Promise.allSettled([
            db!.collection('patients').doc(uid).delete(),
            db!.collection('users').doc(uid).delete()
        ]);

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
