import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        if (!auth || !db) {
            throw new Error('Firebase Admin not initialized');
        }
        // List users (limit to 100 for now)
        const listUsersResult = await auth!.listUsers(100);

        // Fetch profiles from Firestore to get roles
        const users = await Promise.all(listUsersResult.users.map(async (userRecord) => {
            const userDoc = await db!.collection('patients').doc(userRecord.uid).get();
            const userData = userDoc.data();

            return {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName || userData?.name || 'Unknown',
                role: userData?.role || 'patient',
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
        const { email, password, displayName, role } = await request.json();

        if (!email || !password || !role) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Create user in Auth
        const userRecord = await auth!.createUser({
            email,
            password,
            displayName,
        });

        // Create profile in Firestore (shared 'patients' collection)
        await db!.collection('patients').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            name: displayName,
            firstName: displayName.split(' ')[0],
            lastName: displayName.split(' ').slice(1).join(' '),
            role: role,
            createdAt: new Date(),
            status: 'active'
        });

        // Also set custom claims for security rules if needed
        await auth!.setCustomUserClaims(userRecord.uid, { role });

        return NextResponse.json({
            success: true,
            message: 'User created successfully',
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                role
            }
        });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
