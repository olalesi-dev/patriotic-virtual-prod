import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { auth, db } from '@/lib/firebase-admin';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY
    ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
    : null;

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization') || '';
        if (!authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!auth || !db) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const { sessionId, consultationId } = await req.json();
        if (!sessionId || !consultationId) {
            return NextResponse.json({ error: 'Missing sessionId or consultationId' }, { status: 400 });
        }

        const adminDb = db as admin.firestore.Firestore;
        const consultRef = adminDb.collection('consultations').doc(consultationId);
        const consultSnap = await consultRef.get();

        if (!consultSnap.exists) {
            return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
        }

        const consultData = consultSnap.data() ?? {};
        const consultOwnerUid = typeof consultData.uid === 'string' && consultData.uid.trim().length > 0
            ? consultData.uid.trim()
            : (typeof consultData.patientId === 'string' ? consultData.patientId.trim() : '');

        if (!consultOwnerUid || consultOwnerUid !== uid) {
            return NextResponse.json({ error: 'Not authorized for this consultation' }, { status: 403 });
        }

        if (consultData.paymentStatus === 'paid') {
            return NextResponse.json({ success: true, alreadyProcessed: true });
        }

        let stripeSessionId = sessionId;
        if (stripe) {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status !== 'paid') {
                return NextResponse.json({ error: 'Payment not successful yet' }, { status: 400 });
            }
            stripeSessionId = session.id;
        }

        const patientAppointmentsRef = adminDb.collection('patients').doc(uid).collection('appointments');
        const existingPatientAppointment = await patientAppointmentsRef
            .where('consultationId', '==', consultationId)
            .limit(1)
            .get();

        const appointmentPayload = {
            providerName: 'Patriotic Provider',
            providerId: '',
            type: 'Telehealth',
            status: 'pending_scheduling',
            scheduledAt: null,
            meetingUrl: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            consultationId,
            serviceKey: consultData.serviceKey || 'general_visit',
            intakeAnswers: consultData.intake || {},
            reason: consultData.serviceKey || consultData.reason || 'Consultation',
            patientUid: uid,
            date: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            stripeSessionId
        };

        const batch = adminDb.batch();
        batch.set(consultRef, {
            paymentStatus: 'paid',
            status: 'waitlist',
            stripeSessionId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        if (existingPatientAppointment.empty) {
            batch.set(patientAppointmentsRef.doc(), appointmentPayload);
        } else {
            batch.set(existingPatientAppointment.docs[0].ref, {
                ...appointmentPayload,
                createdAt: existingPatientAppointment.docs[0].data().createdAt || admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        await batch.commit();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Telehealth checkout confirm error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
