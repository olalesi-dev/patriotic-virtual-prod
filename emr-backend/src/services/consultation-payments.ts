import { admin, firestore } from '../config/firebase';
import {
    HAIR_LOSS_SERVICE_KEY,
} from './hair-loss-screening';
import {
    METABOLIC_SERVICE_KEY,
} from './metabolic-screening';

const DEFAULT_DOXY_ROOM = 'virtualtelehealth';
const DEFAULT_MEETING_URL = `https://pvt.doxy.me/${DEFAULT_DOXY_ROOM}`;
const DEFAULT_PROVIDER_NAME = 'Patriotic Provider';
const DEFAULT_PROVIDER_ID = '';

export type ConsultationCatalogItem = {
    name: string;
    amount: number;
    interval?: 'day' | 'week' | 'month' | 'year';
    stripeProductId?: string;
    serviceCategory?: string;
    serviceLine?: string;
    clinicalType?: string;
    requiresIntake?: boolean;
    requiresIdVerification?: boolean;
    requiresRxCapableProvider?: boolean;
    chartCategory?: string;
    sku?: string;
    unitLabel?: string;
    statementDescriptor?: string;
};

type StripeCatalogClient = {
    products: {
        retrieve: (productId: string, options?: Record<string, unknown>) => Promise<any>;
    };
    prices: {
        list: (params: Record<string, unknown>) => Promise<{ data: any[] }>;
    };
};

export const CONSULTATION_CATALOG: Record<string, ConsultationCatalogItem> = {
    general_visit: { name: 'General Visit', amount: 7900 },
    weight_loss: { name: 'GLP-1 & Weight Loss', amount: 12900 },
    erectile_dysfunction: { name: 'Erectile Dysfunction', amount: 7900 },
    premature_ejaculation: { name: 'Premature Ejaculation', amount: 7900 },
    [HAIR_LOSS_SERVICE_KEY]: {
        name: 'Hair Growth & Hair Loss Consultation',
        amount: 5900,
        stripeProductId: 'prod_UXVLXwNzWCXPyZ',
        serviceCategory: 'consultation',
        serviceLine: 'hair_loss',
        clinicalType: 'async_or_sync',
        requiresIntake: true,
        requiresIdVerification: true,
        requiresRxCapableProvider: true,
        chartCategory: 'dermatology',
        sku: 'PVT-CONSULT-HAIR-001',
        unitLabel: 'consultation',
        statementDescriptor: 'PVT HAIR CONSULT',
    },
    [METABOLIC_SERVICE_KEY]: {
        name: 'Imaging-Guided Metabolic Wellness Optimization',
        amount: 49900,
        stripeProductId: 'prod_UXYYtyYEe4mYGu',
        serviceCategory: 'program',
        serviceLine: METABOLIC_SERVICE_KEY,
        clinicalType: 'async_or_sync',
        requiresIntake: true,
        requiresIdVerification: true,
        requiresRxCapableProvider: false,
        chartCategory: 'metabolic',
        sku: 'PVT-METABOLIC-WELLNESS-001',
        unitLabel: 'program',
        statementDescriptor: 'PVT METABOLIC WELLNESS',
    },
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

function optionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function arrayOrEmpty(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function getCatalogItemForData(consultationData: Record<string, unknown>): ConsultationCatalogItem | undefined {
    const serviceKey = optionalString(consultationData.serviceKey);
    return serviceKey ? CONSULTATION_CATALOG[serviceKey] : undefined;
}

function getClinicalSnapshot(consultationData: Record<string, unknown>) {
    const catalogItem = getCatalogItemForData(consultationData);
    const screening = consultationData.screening && typeof consultationData.screening === 'object'
        ? consultationData.screening
        : null;
    const screeningRecord = screening && !Array.isArray(screening)
        ? screening as Record<string, unknown>
        : {};
    const screeningResponses = arrayOrEmpty(consultationData.screeningResponses).length > 0
        ? arrayOrEmpty(consultationData.screeningResponses)
        : arrayOrEmpty(screeningRecord.responses);
    const screeningFlags = arrayOrEmpty(consultationData.screeningFlags).length > 0
        ? arrayOrEmpty(consultationData.screeningFlags)
        : arrayOrEmpty(screeningRecord.flags);
    const requiresClinicianReview = typeof consultationData.requiresClinicianReview === 'boolean'
        ? consultationData.requiresClinicianReview
        : typeof screeningRecord.requires_clinician_review === 'boolean'
            ? screeningRecord.requires_clinician_review
            : screeningFlags.length > 0;

    return {
        serviceLine: optionalString(consultationData.serviceLine) ?? optionalString(consultationData.service_line) ?? catalogItem?.serviceLine ?? null,
        serviceCategory: optionalString(consultationData.serviceCategory) ?? optionalString(consultationData.service_category) ?? catalogItem?.serviceCategory ?? null,
        clinicalType: optionalString(consultationData.clinicalType) ?? catalogItem?.clinicalType ?? null,
        chartCategory: optionalString(consultationData.chartCategory) ?? optionalString(consultationData.chart_category) ?? catalogItem?.chartCategory ?? null,
        screeningVersion: optionalString(consultationData.screeningVersion) ?? optionalString(consultationData.screening_version) ?? optionalString(screeningRecord.version) ?? null,
        screening,
        screeningResponses,
        screeningFlags,
        requiresClinicianReview,
    };
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
    const clinicalSnapshot = getClinicalSnapshot(consultationData);
    const patientAppointmentsRef = firestore.collection('patients').doc(uid).collection('appointments');
    const patientEncountersRef = firestore.collection('patients').doc(uid).collection('encounters');
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
        serviceLine: clinicalSnapshot.serviceLine,
        service_line: clinicalSnapshot.serviceLine,
        serviceCategory: clinicalSnapshot.serviceCategory,
        clinicalType: clinicalSnapshot.clinicalType,
        chartCategory: clinicalSnapshot.chartCategory,
        chart_category: clinicalSnapshot.chartCategory,
        screeningVersion: clinicalSnapshot.screeningVersion,
        screening_version: clinicalSnapshot.screeningVersion,
        screening: clinicalSnapshot.screening,
        screeningResponses: clinicalSnapshot.screeningResponses,
        screeningFlags: clinicalSnapshot.screeningFlags,
        requiresClinicianReview: clinicalSnapshot.requiresClinicianReview,
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
    const encounterRef = firestore.collection('encounters').doc(consultationId);
    const patientEncounterRef = patientEncountersRef.doc(consultationId);
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

    const encounterPayload = {
        id: consultationId,
        title: buildReason(consultationData.serviceKey, consultationData.reason),
        consultationId,
        appointmentId: consultationId,
        patientUid: uid,
        patientId: uid,
        patientName: appointmentPayload.patientName,
        patientEmail: appointmentPayload.patientEmail,
        serviceKey: appointmentPayload.serviceKey,
        serviceLine: clinicalSnapshot.serviceLine,
        service_line: clinicalSnapshot.serviceLine,
        serviceCategory: clinicalSnapshot.serviceCategory,
        clinicalType: clinicalSnapshot.clinicalType,
        chartCategory: clinicalSnapshot.chartCategory,
        chart_category: clinicalSnapshot.chartCategory,
        type: 'telehealth_consultation',
        status: clinicalSnapshot.requiresClinicianReview ? 'pending_clinician_review' : 'pending_provider_review',
        intakeAnswers: consultationData.intake || {},
        screeningVersion: clinicalSnapshot.screeningVersion,
        screening_version: clinicalSnapshot.screeningVersion,
        screening: clinicalSnapshot.screening,
        screeningResponses: clinicalSnapshot.screeningResponses,
        screeningFlags: clinicalSnapshot.screeningFlags,
        requiresClinicianReview: clinicalSnapshot.requiresClinicianReview,
        paymentStatus: 'paid',
        stripeSessionId,
        createdAt: consultationData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(encounterRef, encounterPayload, { merge: true });
    batch.set(patientEncounterRef, encounterPayload, { merge: true });

    await batch.commit();

    return consultationData;
}

function getEnvPriceOverride(serviceKey: string): string | null {
    const envKey = `STRIPE_PRICE_${serviceKey.toUpperCase()}`;
    const serviceAlias = serviceKey === HAIR_LOSS_SERVICE_KEY
        ? optionalString(process.env.STRIPE_HAIR_LOSS_PRICE_ID)
        : serviceKey === METABOLIC_SERVICE_KEY
            ? optionalString(process.env.STRIPE_METABOLIC_PRICE_ID) ?? optionalString(process.env.STRIPE_METABOLIC_WELLNESS_PRICE_ID)
            : null;

    return optionalString(process.env[envKey]) ?? serviceAlias;
}

function isCatalogIntervalMatch(price: any, item: ConsultationCatalogItem): boolean {
    if (item.interval) {
        return price.recurring?.interval === item.interval;
    }

    return !price.recurring;
}

function getExpandedPriceId(defaultPrice: string | Record<string, any> | null | undefined, item: ConsultationCatalogItem): string | null {
    if (!defaultPrice) return null;
    if (typeof defaultPrice === 'string') return defaultPrice;
    if (defaultPrice.active === false) return null;
    if (!isCatalogIntervalMatch(defaultPrice, item)) return null;
    return defaultPrice.id;
}

async function resolveStripeCatalogPriceId(
    stripeClient: StripeCatalogClient,
    serviceKey: string,
    item: ConsultationCatalogItem,
): Promise<string> {
    const override = getEnvPriceOverride(serviceKey);
    if (override) return override;

    if (!item.stripeProductId) {
        throw new Error(`No Stripe product configured for ${serviceKey}`);
    }

    const product = await stripeClient.products.retrieve(item.stripeProductId, {
        expand: ['default_price'],
    });

    if ('deleted' in product && product.deleted) {
        throw new Error(`Stripe product is deleted for ${serviceKey}`);
    }

    const defaultPriceId = getExpandedPriceId(product.default_price, item);
    if (defaultPriceId) return defaultPriceId;

    const activePrices = await stripeClient.prices.list({
        product: item.stripeProductId,
        active: true,
        limit: 100,
    });

    const matchingPrices = activePrices.data.filter((price: any) => isCatalogIntervalMatch(price, item));
    const preferredPrice = matchingPrices.find((price: any) => {
        const checkoutDefault = typeof price.metadata?.checkout_default === 'string'
            ? price.metadata.checkout_default.toLowerCase()
            : '';
        return checkoutDefault === 'true' || price.lookup_key === `${serviceKey}_default`;
    }) ?? matchingPrices[0];

    if (!preferredPrice) {
        throw new Error(`No active Stripe price found for ${serviceKey}`);
    }

    return preferredPrice.id;
}

export async function buildStripeLineItem(serviceKey: string, stripeClient?: StripeCatalogClient) {
    const item = CONSULTATION_CATALOG[serviceKey];
    if (!item) {
        throw new Error(`Invalid service: ${serviceKey}`);
    }

    if (item.stripeProductId) {
        if (!stripeClient) {
            throw new Error(`Stripe client is required to resolve ${serviceKey} pricing`);
        }

        return {
            quantity: 1,
            price: await resolveStripeCatalogPriceId(stripeClient, serviceKey, item),
        };
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
