import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

export async function GET() {
    const email = 'dayoolufolaju@gmail.com';
    try {
        if (!auth || !db) {
            throw new Error('Firebase Admin not initialized');
        }

        console.log(`Searching for user: ${email}...`);
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;

        // 1. Set Custom Claims in Auth
        await auth.setCustomUserClaims(uid, { role: 'admin' });

        // 2. Update Firestore profile
        await db.collection('patients').doc(uid).set({
            role: 'admin',
            status: 'active',
            updatedAt: new Date()
        }, { merge: true });

        return NextResponse.json({ success: true, message: `User ${email} promoted to admin` });
    } catch (error: any) {
        console.error('Promotion Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
