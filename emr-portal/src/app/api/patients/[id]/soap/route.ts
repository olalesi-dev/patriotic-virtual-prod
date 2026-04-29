import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { requireAuthenticatedUser, ensureProviderAccess } from '@/lib/server-auth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const { user, errorResponse } = await requireAuthenticatedUser(request, { resolveRole: true });
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const providerAccessError = ensureProviderAccess(user);
    if (providerAccessError) return providerAccessError;

    if (!db) {
        return NextResponse.json(
            { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
            { status: 500 }
        );
    }

    try {
        const patientId = params.id;
        const { soapNote } = await request.json();

        if (!soapNote || soapNote.trim() === '') {
            return NextResponse.json({ success: false, error: 'No SOAP note provided.' }, { status: 400 });
        }

        const patientRef = db.collection('patients').doc(patientId);
        const patientDoc = await patientRef.get();

        if (!patientDoc.exists) {
            return NextResponse.json({ success: false, error: 'Patient not found.' }, { status: 404 });
        }

        const batch = db.batch();

        const timelineRef = patientRef.collection('timeline').doc();
        batch.set(timelineRef, {
            type: 'encounter',
            date: new Date().toISOString(),
            description: 'Telehealth Consultation (AI Scribe)',
            notes: `[SOAP Note]\n${soapNote}`,
            providerId: user.uid,
            providerName: (user as any).displayName || (user as any).name || 'Provider',
            createdAt: new Date()
        });

        const encounterRef = patientRef.collection('encounters').doc();
        batch.set(encounterRef, {
            date: new Date().toISOString(),
            type: 'Telehealth',
            providerId: user.uid,
            status: 'completed',
            notes: soapNote,
            createdAt: new Date()
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: 'SOAP note assigned to patient successfully.' });
    } catch (error: any) {
        console.error('Error saving SOAP note to patient:', error);
        return NextResponse.json({ success: false, error: error.message || 'Server Error' }, { status: 500 });
    }
}
