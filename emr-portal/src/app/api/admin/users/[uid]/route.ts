import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

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
        const { role, disabled, displayName } = await request.json();

        const updates: any = {};
        if (displayName !== undefined) updates.displayName = displayName;
        if (disabled !== undefined) updates.disabled = disabled;

        // Update Auth if needed
        if (Object.keys(updates).length > 0) {
            await auth!.updateUser(uid, updates);
        }

        // Update Firestore role/profile
        const firestoreUpdates: any = {};
        if (role !== undefined) {
            firestoreUpdates.role = role;
            // Update custom claims too
            await auth!.setCustomUserClaims(uid, { role });
        }
        if (displayName !== undefined) {
            firestoreUpdates.name = displayName;
            firestoreUpdates.firstName = displayName.split(' ')[0];
            firestoreUpdates.lastName = displayName.split(' ').slice(1).join(' ');
        }
        if (disabled !== undefined) {
            firestoreUpdates.status = disabled ? 'disabled' : 'active';
        }

        if (Object.keys(firestoreUpdates).length > 0) {
            // Use set with merge: true to avoid NOT_FOUND errors if the doc doesn't exist yet
            await db!.collection('patients').doc(uid).set(firestoreUpdates, { merge: true });

            // Also sync the update to the 'users' collection so providers/admins 
            // have their role and profile stored where the dashboard expects it
            await db!.collection('users').doc(uid).set(firestoreUpdates, { merge: true });
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
        await db!.collection('patients').doc(uid).delete();

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
