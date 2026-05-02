import { admin, firestore } from '../config/firebase';

const DEFAULT_DOXY_ROOM = 'virtualtelehealth';
const DEFAULT_MEETING_URL = `https://pvt.doxy.me/${DEFAULT_DOXY_ROOM}`;
const DEFAULT_PROVIDER_NAME = 'Patriotic Provider';
const DEFAULT_PROVIDER_ID = '';

export const CONSULTATION_CATALOG: Record<string, { name: string; amount: number; interval?: string }> = {
    general_visit: { name: 'General Visit', amount: 7900 },
    weight_loss: { name: 'GLP-1 & Weight Loss', amount: 12900 },
    erectile_dysfunction: { name: 'Erectile Dysfunction', amount: 7900 },
    premature_ejaculation: { name: 'Premature Ejaculation', amount: 7900 },
    ai_imaging: { name: 'AI-Powered Imaging Analysis', amount: 9900 },
    report_interpretation: { name: 'Report Interpretation', amount: 14900 },
    standard_imaging: { name: 'Standard Imaging Review', amount: 24900 },
    imaging_video: { name: 'Imaging + Video Consult', amount: 44900 },
    diagnostic_single: { name: 'Single Study Read', amount: 7500 },
    diagnostic_second: { name: 'Diagnostic Second Opinion', amount: 25000 },
    ai_assistant: { name: 'Care Navigation Support', amount: 2900, interval: 'month' },
    digital_platform: { name: 'Digital Health Platform', amount: 1900, interval: 'month' },
    membership_elite: { name: 'All Access — Elite', amount: 19900, interval: 'month' },
    membership_plus: { name: 'All Access — Plus', amount: 14900, interval: 'month' },
    membership_core: { name: 'All Access — Core', amount: 9900, interval: 'month' },
    telehealth_premium: { name: 'Telehealth Premium', amount: 9900, interval: 'month' },
    telehealth_standard: { name: 'Telehealth Standard', amount: 5900, interval: 'month' },
    telehealth_basic: { name: 'Telehealth Basic', amount: 2900, interval: 'month' },
};

function buildReason(serviceKey: string | undefined, fallbackReason: unknown) {
    if (serviceKey && CONSULTATION_CATALOG[serviceKey]) {
        return CONSULTATION_CATALOG[serviceKey].name;
    }

    if (typeof fallbackReason === 'string' && fallbackReason.trim().length > 0) {
        return fallbackReason.trim();
    }

    return serviceKey || 'Consultation';
}

export async function completeTelehealthConsultationPayment(args: {
    consultationId: string;
    uid: string;
    stripeSessionId: string;
}) {
    const { consultationId, uid, stripeSessionId } = args;
    const consultationRef = firestore.collection('consultations').doc(consultationId);
    const consultationSnap = await consultationRef.get();

    if (!consultationSnap.exists) {
        throw new Error('Consultation not found');
    }

    const consultationData = consultationSnap.data() ?? {};
    const patientAppointmentsRef = firestore.collection('patients').doc(uid).collection('appointments');
    const existingPatientAppointment = await patientAppointmentsRef
        .where('consultationId', '==', consultationId)
        .limit(1)
        .get();

    const patientDocRef = firestore.collection('patients').doc(uid);
    const patientSnap = await patientDocRef.get();
    const patientData = patientSnap.exists ? patientSnap.data() ?? {} : {};

    const appointmentPayload = {
        providerName: DEFAULT_PROVIDER_NAME,
        providerId: DEFAULT_PROVIDER_ID,
        type: 'Telehealth',
        status: 'pending_scheduling',
        scheduledAt: null,
        doxyRoom: DEFAULT_DOXY_ROOM,
        meetingUrl: DEFAULT_MEETING_URL,
        consultationId,
        serviceKey: consultationData.serviceKey || 'general_visit',
        intakeAnswers: consultationData.intake || {},
        reason: buildReason(consultationData.serviceKey, consultationData.reason),
        patientUid: uid,
        patientId: uid,
        patientName: consultationData.patient || patientData.name || 'Patient',
        patientEmail: consultationData.patientEmail || patientData.email || null,
        patientPhone: patientData.phone || null,
        date: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeSessionId,
        paymentStatus: 'paid',
    };

    const topLevelAppointmentRef = firestore.collection('appointments').doc(consultationId);
    const batch = firestore.batch();

    batch.set(consultationRef, {
        paymentStatus: 'paid',
        status: 'waitlist',
        stripeSessionId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    if (existingPatientAppointment.empty) {
        batch.set(patientAppointmentsRef.doc(), appointmentPayload);
    } else {
        batch.set(existingPatientAppointment.docs[0].ref, {
            ...appointmentPayload,
            createdAt: existingPatientAppointment.docs[0].data().createdAt || admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    batch.set(topLevelAppointmentRef, {
        ...appointmentPayload,
        status: 'PENDING_SCHEDULING',
    }, { merge: true });

    await batch.commit();

    return consultationData;
}

export function buildStripeLineItem(serviceKey: string) {
    const item = CONSULTATION_CATALOG[serviceKey];
    if (!item) {
        throw new Error(`Invalid service: ${serviceKey}`);
    }

    return {
        quantity: 1,
        price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: item.amount,
            ...(item.interval ? {
                recurring: { interval: item.interval as 'day' | 'week' | 'month' | 'year' },
            } : {}),
        },
    };
}
