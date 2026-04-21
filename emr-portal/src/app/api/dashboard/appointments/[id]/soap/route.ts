import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { requireAuthenticatedUser, ensureProviderAccess } from '@/lib/server-auth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const { user, errorResponse } = await requireAuthenticatedUser(request, { resolveRole: true });
    if (errorResponse) return errorResponse;
    
    const providerAccessError = ensureProviderAccess(user);
    if (providerAccessError) return providerAccessError;

    if (!db) {
        return NextResponse.json(
            { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
            { status: 500 }
        );
    }

    try {
        const appointmentId = params.id;
        const { soapNote } = await request.json();

        if (!soapNote || soapNote.trim() === '') {
            return NextResponse.json({ success: false, error: 'No SOAP note provided.' }, { status: 400 });
        }

        const appointmentRef = db.collection('appointments').doc(appointmentId);
        const appointmentDoc = await appointmentRef.get();

        if (!appointmentDoc.exists) {
            return NextResponse.json({ success: false, error: 'Appointment not found.' }, { status: 404 });
        }

        const appointmentData = appointmentDoc.data();
        const patientId = appointmentData?.patientId || appointmentData?.patientUid;

        const batch = db.batch();

        // Update global appointment record
        batch.set(appointmentRef, {
            notes: appointmentData?.notes ? `${appointmentData.notes}\n\n[SOAP Note]\n${soapNote}` : `[SOAP Note]\n${soapNote}`,
            soapNote: soapNote,
            updatedAt: new Date()
        }, { merge: true });

        // Update patient-specific appointment record
        if (patientId) {
            const patientAppointmentRef = db
                .collection('patients')
                .doc(patientId)
                .collection('appointments')
                .doc(appointmentId);
            
            const patientApptDoc = await patientAppointmentRef.get();
            if (patientApptDoc.exists) {
                const patApptData = patientApptDoc.data();
                batch.set(patientAppointmentRef, {
                    notes: patApptData?.notes ? `${patApptData.notes}\n\n[SOAP Note]\n${soapNote}` : `[SOAP Note]\n${soapNote}`,
                    soapNote: soapNote,
                    updatedAt: new Date()
                }, { merge: true });
            }
        }

        await batch.commit();

        return NextResponse.json({ success: true, message: 'SOAP note saved successfully.' });
    } catch (error: any) {
        console.error('Error saving SOAP note:', error);
        return NextResponse.json({ success: false, error: error.message || 'Server Error' }, { status: 500 });
    }
}
