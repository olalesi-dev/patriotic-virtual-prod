import { Router } from 'express';
import { admin, firebaseAuth, firestore } from '../config/firebase';
import { CONSULTATION_CATALOG } from '../services/consultation-payments';
import {
    HAIR_LOSS_SERVICE_KEY,
    HairLossScreeningValidationError,
    normalizeHairLossScreening,
} from '../services/hair-loss-screening';
import {
    METABOLIC_HOLD_MESSAGE,
    METABOLIC_SERVICE_KEY,
    MetabolicScreeningValidationError,
    normalizeMetabolicScreening,
} from '../services/metabolic-screening';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { serviceKey, intake, stripeProductId, screening } = req.body as {
            serviceKey?: string;
            intake?: Record<string, unknown>;
            stripeProductId?: string | null;
            screening?: unknown;
        };
        const normalizedServiceKey = typeof serviceKey === 'string' && serviceKey.trim().length > 0
            ? serviceKey.trim()
            : 'unknown';
        const catalogItem = CONSULTATION_CATALOG[normalizedServiceKey];

        if (normalizedServiceKey !== 'unknown' && !catalogItem) {
            return res.status(400).json({ error: `Invalid service: ${normalizedServiceKey}` });
        }

        let realFirst = '';
        let realLast = '';
        let realEmail = '';

        try {
            const userRecord = await firebaseAuth.getUser(uid);
            realEmail = userRecord.email || '';
            if (userRecord.displayName) {
                const parts = userRecord.displayName.split(' ');
                realFirst = parts[0] || '';
                realLast = parts.slice(1).join(' ') || '';
            }
        } catch (error) {
            logger.warn('Auth fetch failed in consultations route', { uid, error });
        }

        const firstName = String((intake?.firstName || intake?.first_name || realFirst || 'Patient') ?? 'Patient');
        const lastName = String((intake?.lastName || intake?.last_name || realLast || '') ?? '');
        const email = String((intake?.email || realEmail || '') ?? '');
        const clinicalPayload: Record<string, unknown> = {};

        if (normalizedServiceKey === HAIR_LOSS_SERVICE_KEY) {
            try {
                const normalizedScreening = normalizeHairLossScreening(screening);
                Object.assign(clinicalPayload, {
                    serviceCategory: catalogItem?.serviceCategory ?? 'consultation',
                    serviceLine: catalogItem?.serviceLine ?? HAIR_LOSS_SERVICE_KEY,
                    service_line: catalogItem?.serviceLine ?? HAIR_LOSS_SERVICE_KEY,
                    clinicalType: catalogItem?.clinicalType ?? 'async_or_sync',
                    chartCategory: catalogItem?.chartCategory ?? 'dermatology',
                    chart_category: catalogItem?.chartCategory ?? 'dermatology',
                    requiresIntake: catalogItem?.requiresIntake ?? true,
                    requiresIdVerification: catalogItem?.requiresIdVerification ?? true,
                    requiresRxCapableProvider: catalogItem?.requiresRxCapableProvider ?? true,
                    screeningVersion: normalizedScreening.screeningVersion,
                    screening_version: normalizedScreening.screeningVersion,
                    screening: normalizedScreening.screening,
                    screeningResponses: normalizedScreening.screeningResponses,
                    screeningFlags: normalizedScreening.screeningFlags,
                    requiresClinicianReview: normalizedScreening.requiresClinicianReview,
                    stripeProductId: catalogItem?.stripeProductId ?? stripeProductId ?? null,
                    sku: catalogItem?.sku ?? null,
                });
            } catch (error) {
                if (error instanceof HairLossScreeningValidationError) {
                    return res.status(error.statusCode).json({ error: error.message });
                }
                throw error;
            }
        }

        if (normalizedServiceKey === METABOLIC_SERVICE_KEY) {
            try {
                const normalizedScreening = normalizeMetabolicScreening(screening);
                Object.assign(clinicalPayload, {
                    serviceCategory: catalogItem?.serviceCategory ?? 'program',
                    serviceLine: catalogItem?.serviceLine ?? METABOLIC_SERVICE_KEY,
                    service_line: catalogItem?.serviceLine ?? METABOLIC_SERVICE_KEY,
                    clinicalType: catalogItem?.clinicalType ?? 'async_or_sync',
                    chartCategory: catalogItem?.chartCategory ?? 'metabolic',
                    chart_category: catalogItem?.chartCategory ?? 'metabolic',
                    requiresIntake: catalogItem?.requiresIntake ?? true,
                    requiresIdVerification: catalogItem?.requiresIdVerification ?? true,
                    requiresRxCapableProvider: catalogItem?.requiresRxCapableProvider ?? false,
                    screeningVersion: normalizedScreening.screeningVersion,
                    screening_version: normalizedScreening.screeningVersion,
                    screening: normalizedScreening.screening,
                    screeningResponses: normalizedScreening.screeningResponses,
                    screeningFlags: normalizedScreening.screeningFlags,
                    requiresClinicianReview: normalizedScreening.requiresClinicianReview,
                    paymentEligible: normalizedScreening.paymentEligible,
                    holdMessage: normalizedScreening.holdMessage,
                    stripeProductId: catalogItem?.stripeProductId ?? stripeProductId ?? null,
                    sku: catalogItem?.sku ?? null,
                    initialStatus: normalizedScreening.paymentEligible ? 'pending' : 'pending_clinician_review',
                    initialPaymentStatus: normalizedScreening.paymentEligible ? 'unpaid' : 'not_required',
                });
            } catch (error) {
                if (error instanceof MetabolicScreeningValidationError) {
                    return res.status(error.statusCode).json({ error: error.message });
                }
                throw error;
            }
        }

        const initialStatus = typeof clinicalPayload.initialStatus === 'string'
            ? clinicalPayload.initialStatus
            : 'pending';
        const initialPaymentStatus = typeof clinicalPayload.initialPaymentStatus === 'string'
            ? clinicalPayload.initialPaymentStatus
            : 'unpaid';
        delete clinicalPayload.initialStatus;
        delete clinicalPayload.initialPaymentStatus;

        const consultationRef = await firestore.collection('consultations').add({
            uid,
            patient: `${firstName} ${lastName}`.trim(),
            patientEmail: email,
            serviceKey: normalizedServiceKey,
            intake: intake || {},
            stripeProductId: clinicalPayload.stripeProductId || stripeProductId || catalogItem?.stripeProductId || null,
            status: initialStatus,
            paymentStatus: initialPaymentStatus,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ...clinicalPayload,
        });

        await firestore.collection('patients').doc(uid).set({
            uid,
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            email,
            dob: intake?.dateOfBirth || '',
            state: intake?.state || '',
            lastVisit: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        const isMetabolicHold = normalizedServiceKey === METABOLIC_SERVICE_KEY && clinicalPayload.paymentEligible === false;
        return res.json({
            id: consultationRef.id,
            message: isMetabolicHold ? METABOLIC_HOLD_MESSAGE : 'Consultation created',
            hold: isMetabolicHold,
            holdMessage: isMetabolicHold ? METABOLIC_HOLD_MESSAGE : null,
        });
    } catch (error) {
        logger.error('Error creating consultation', { error });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});

export default router;
