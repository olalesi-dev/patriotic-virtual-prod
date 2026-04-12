import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import {
    enqueueWebhookProcessing,
    ensureDoseSpotTestClinicianForUser,
    extractEventType,
    getDoseSpotWebhookRuntimeHealth,
    getDoseSpotWebhookValidationReport,
    markWebhookEventFailed,
    markWebhookEventQueued,
    persistWebhookEvent,
    processWebhookEvent,
    triggerDoseSpotDevTestActivity,
    verifyDoseSpotSecret,
    verifyDoseSpotTaskRequest
} from '../services/dosespot-push';
import { deleteDoseSpotPatientForUid, ensureDoseSpotPatientForUid } from '../services/dosespot-patients';
import {
    acceptDoseSpotIdpDisclaimerForUid,
    acceptDoseSpotLegalAgreementForUid,
    fetchDoseSpotClinicianRegistrationStatusForUid,
    fetchDoseSpotIdpDisclaimerForUid,
    fetchDoseSpotLegalAgreementsForUid,
    getDoseSpotClinicianReadinessForUid,
    initDoseSpotIdpForUid,
    syncDoseSpotClinicianForUid,
    startDoseSpotIdpForUid,
    submitDoseSpotIdpAnswersForUid,
    submitDoseSpotIdpOtpForUid
} from '../services/dosespot-clinicians';
import {
    fetchDoseSpotMedicationHistoryForPatientUid,
    fetchDoseSpotPendingRefillsQueue,
    fetchDoseSpotPendingRxChangesQueue,
    fetchDoseSpotPrescriptionSummaryForPatientUid,
    logDoseSpotMedicationHistoryConsentForPatientUid
} from '../services/dosespot-workflows';
import { runDoseSpotScreenDemoValidation } from '../services/dosespot-validation';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();

function hasInternalDoseSpotAccess(req: Request): boolean {
    const configuredSecret = typeof process.env.DOSESPOT_SECRET_KEY === 'string'
        ? process.env.DOSESPOT_SECRET_KEY.trim()
        : '';
    const providedSecret = typeof req.headers['x-dosespot-secret'] === 'string'
        ? req.headers['x-dosespot-secret'].trim()
        : '';

    return configuredSecret.length > 0 && providedSecret === configuredSecret;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function normalizeRole(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}

function parsePositiveInt(value: unknown): number | undefined {
    const parsed = asNumber(value);
    if (!parsed || parsed <= 0) return undefined;
    return Math.floor(parsed);
}

function parseClinicScope(value: unknown): 'Current' | 'All' {
    if (typeof value !== 'string') return 'Current';
    return value.trim().toLowerCase() === 'all' ? 'All' : 'Current';
}

function canManageOtherPatients(role: string | null): boolean {
    return Boolean(role && [
        'provider',
        'doctor',
        'clinician',
        'admin',
        'systems admin',
        'staff',
        'orgadmin',
        'superadmin',
        'biller'
    ].includes(role));
}

function getObjectBody(req: Request): Record<string, unknown> {
    return (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body))
        ? req.body as Record<string, unknown>
        : {};
}

async function resolveDoseSpotRequester(uid: string, tokenRole: unknown) {
    const firestore = admin.firestore();
    const [userDoc, patientDoc] = await Promise.all([
        firestore.collection('users').doc(uid).get(),
        firestore.collection('patients').doc(uid).get()
    ]);

    const userData = userDoc.exists ? userDoc.data() : undefined;
    const patientData = patientDoc.exists ? patientDoc.data() : undefined;

    return {
        role: normalizeRole(tokenRole) ?? normalizeRole(userData?.role) ?? normalizeRole(patientData?.role),
        doseSpotClinicianId: asNumber(userData?.doseSpotClinicianId)
    };
}

router.post('/push-notifications', async (req: Request, res: Response) => {
    if (!verifyDoseSpotSecret(req)) {
        return res.status(401).json({ error: 'Invalid or missing DoseSpot secret' });
    }

    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid DoseSpot payload' });
    }

    const payload = req.body as Record<string, unknown>;
    const eventType = extractEventType(payload);
    if (!eventType) {
        return res.status(400).json({ error: 'Missing EventType' });
    }

    try {
        const persisted = await persistWebhookEvent({
            payload,
            headers: req.headers,
            authorizationValid: true,
            receivedAt: new Date()
        });

        let inlineProcessed = false;
        if (persisted.shouldEnqueue) {
            try {
                const enqueueResult = await enqueueWebhookProcessing(persisted.eventId);
                await markWebhookEventQueued(persisted.eventId, enqueueResult);

                if (enqueueResult.mode === 'inline_fallback') {
                    // Cloud Run throttles background CPU after the response; process inline to avoid dropped webhook work.
                    await processWebhookEvent(persisted.eventId);
                    inlineProcessed = true;
                }
            } catch (error) {
                await markWebhookEventFailed(persisted.eventId, error);
                throw error;
            }
        }

        return res.status(200).json({
            received: true,
            eventId: persisted.eventId,
            eventType: persisted.eventType,
            duplicate: persisted.duplicate,
            queued: persisted.shouldEnqueue,
            inlineProcessed
        });
    } catch (error) {
        logger.error('[DoseSpot Webhook] Failed to ingest event', {
            eventType,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to ingest DoseSpot event' });
    }
});

router.post('/push-notifications/process', async (req: Request, res: Response) => {
    const authorized = await verifyDoseSpotTaskRequest(req);
    if (!authorized) {
        return res.status(401).json({ error: 'Unauthorized task invocation' });
    }

    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid processor payload' });
    }

    const body = req.body as Record<string, unknown>;
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    if (!eventId) {
        return res.status(400).json({ error: 'Missing eventId' });
    }

    try {
        const result = await processWebhookEvent(eventId);
        return res.status(200).json({
            success: true,
            alreadyProcessed: result.alreadyProcessed,
            eventId,
            notificationId: result.notificationId,
            recipientId: result.recipientId,
            internalType: result.internalType
        });
    } catch (error) {
        await markWebhookEventFailed(eventId, error);
        return res.status(500).json({
            error: 'DoseSpot event processing failed',
            eventId
        });
    }
});

router.get('/push-notifications/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        service: 'patriotic-telehealth-dosespot-webhook',
        timestamp: new Date().toISOString(),
        runtime: getDoseSpotWebhookRuntimeHealth()
    });
});

router.get('/push-notifications/validation', verifyFirebaseToken, async (_req: Request, res: Response) => {
    try {
        const report = await getDoseSpotWebhookValidationReport();
        return res.status(200).json(report);
    } catch (error) {
        logger.error('[DoseSpot Webhook] Failed to build webhook validation report', {
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to load DoseSpot webhook validation report.' });
    }
});

router.post('/screen-demo/validation', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = getObjectBody(req);
    const requestedPatientUid = typeof body.patientUid === 'string' && body.patientUid.trim().length > 0
        ? body.patientUid.trim()
        : undefined;

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);
        if (requestedPatientUid && requestedPatientUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to run DoseSpot validation for another patient.' });
        }

        const result = await runDoseSpotScreenDemoValidation({
            requesterUid,
            requesterClinicianId: requester.doseSpotClinicianId,
            patientUid: requestedPatientUid,
            clinicId: parseClinicScope(body.clinicId)
        });

        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Validation] Failed to run screen-demo checks', {
            requesterUid,
            requestedPatientUid: requestedPatientUid ?? null,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to run DoseSpot screen-demo validation.' });
    }
});

router.get('/clinicians/readiness', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const readiness = await getDoseSpotClinicianReadinessForUid(uid);
        return res.status(200).json({ readiness });
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to load readiness', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to load DoseSpot clinician readiness.' });
    }
});

router.post('/clinicians/sync', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = getObjectBody(req);
    const requestedClinicianUid = typeof body.clinicianUid === 'string' && body.clinicianUid.trim().length > 0
        ? body.clinicianUid.trim()
        : requesterUid;

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);
        if (requestedClinicianUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to sync DoseSpot clinicians for another provider.' });
        }

        const result = await syncDoseSpotClinicianForUid(requestedClinicianUid);
        return res.status(200).json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sync DoseSpot clinician.';
        logger.error('[DoseSpot Clinician] Failed to sync clinician', {
            requesterUid,
            requestedClinicianUid,
            error: message
        });
        const status = message.includes('configured DoseSpot user is not authorized to add clinicians')
            ? 502
            : 500;
        return res.status(status).json({ error: message });
    }
});

router.post('/clinicians/internal-sync', async (req: Request, res: Response) => {
    if (!hasInternalDoseSpotAccess(req)) {
        return res.status(401).json({ error: 'Unauthorized internal DoseSpot sync request.' });
    }

    const body = getObjectBody(req);
    const clinicianUid = typeof body.clinicianUid === 'string' && body.clinicianUid.trim().length > 0
        ? body.clinicianUid.trim()
        : null;

    if (!clinicianUid) {
        return res.status(400).json({ error: 'Missing clinicianUid.' });
    }

    try {
        const result = await syncDoseSpotClinicianForUid(clinicianUid);
        return res.status(200).json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sync DoseSpot clinician.';
        logger.error('[DoseSpot Clinician] Internal sync failed', {
            clinicianUid,
            error: message
        });
        const status = message.includes('configured DoseSpot user is not authorized to add clinicians')
            ? 502
            : 500;
        return res.status(status).json({ error: message });
    }
});

router.get('/clinicians/registration-status', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestedClinicianUid = typeof req.query.clinicianUid === 'string' && req.query.clinicianUid.trim().length > 0
        ? req.query.clinicianUid.trim()
        : requesterUid;

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);
        if (requestedClinicianUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to read DoseSpot clinician registration status for another provider.' });
        }

        const result = await fetchDoseSpotClinicianRegistrationStatusForUid(requestedClinicianUid);
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to fetch registration status', {
            requesterUid,
            requestedClinicianUid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load DoseSpot clinician registration status.' });
    }
});

router.get('/clinicians/legal-agreements', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await fetchDoseSpotLegalAgreementsForUid(uid);
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to load legal agreements', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load DoseSpot legal agreements.' });
    }
});

router.post('/clinicians/legal-agreements/accept', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await acceptDoseSpotLegalAgreementForUid(uid, getObjectBody(req));
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to accept legal agreement', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to submit DoseSpot legal agreement acceptance.' });
    }
});

router.get('/clinicians/idp/disclaimer', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await fetchDoseSpotIdpDisclaimerForUid(uid);
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to load IDP disclaimer', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load DoseSpot IDP disclaimer.' });
    }
});

router.post('/clinicians/idp/disclaimer', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await acceptDoseSpotIdpDisclaimerForUid(uid, getObjectBody(req));
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to accept IDP disclaimer', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to submit DoseSpot IDP disclaimer acceptance.' });
    }
});

router.post('/clinicians/idp/init', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await initDoseSpotIdpForUid(uid);
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to initialize IDP', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to initialize DoseSpot IDP.' });
    }
});

router.post('/clinicians/idp/start', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await startDoseSpotIdpForUid(uid, getObjectBody(req));
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to start IDP', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to submit DoseSpot IDP request.' });
    }
});

router.post('/clinicians/idp/answers', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await submitDoseSpotIdpAnswersForUid(uid, getObjectBody(req));
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to submit IDP answers', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to submit DoseSpot IDP answers.' });
    }
});

router.post('/clinicians/idp/otp', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await submitDoseSpotIdpOtpForUid(uid, getObjectBody(req));
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Clinician] Failed to submit IDP OTP', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to submit DoseSpot IDP OTP.' });
    }
});

router.post('/push-notifications/dev/test-activity', verifyFirebaseToken, async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }

    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await triggerDoseSpotDevTestActivity(uid);
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error('[DoseSpot Webhook] Failed to create dev test activity', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to create test DoseSpot activity' });
    }
});

router.post('/push-notifications/dev/link-test-clinician', verifyFirebaseToken, async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }

    const uid = req['user']?.uid;
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = getObjectBody(req);
    const requestedClinicianId = typeof body.clinicianId === 'number'
        ? body.clinicianId
        : (typeof body.clinicianId === 'string' ? Number.parseInt(body.clinicianId, 10) : null);

    try {
        const result = await ensureDoseSpotTestClinicianForUser(
            uid,
            Number.isFinite(requestedClinicianId ?? NaN) ? requestedClinicianId : null
        );
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error('[DoseSpot Webhook] Failed to link dev test clinician', {
            uid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to link test DoseSpot clinician' });
    }
});

router.post('/patients/ensure', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body))
        ? req.body as Record<string, unknown>
        : {};
    const requestedPatientUid = typeof body.patientUid === 'string' && body.patientUid.trim().length > 0
        ? body.patientUid.trim()
        : requesterUid;
    const updateExisting = body.updateExisting === true;

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);

        if (requestedPatientUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to sync DoseSpot data for another patient.' });
        }

        const result = await ensureDoseSpotPatientForUid(requestedPatientUid, {
            updateExisting
        });

        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Patient Sync] Ensure route failed', {
            requesterUid,
            requestedPatientUid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to ensure DoseSpot patient link' });
    }
});

router.post('/patients/:patientUid/preferred-pharmacy/sync', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestedPatientUid = typeof req.params.patientUid === 'string' ? req.params.patientUid.trim() : '';
    if (!requestedPatientUid) {
        return res.status(400).json({ error: 'Missing patientUid route parameter.' });
    }

    const body = getObjectBody(req);
    const preferredPharmacyDoseSpotId = asNumber(body.preferredPharmacyDoseSpotId ?? body.pharmacyId);
    const preferredPharmacy = typeof body.preferredPharmacy === 'string' && body.preferredPharmacy.trim().length > 0
        ? body.preferredPharmacy.trim()
        : null;

    if (preferredPharmacyDoseSpotId !== null && preferredPharmacyDoseSpotId <= 0) {
        return res.status(400).json({ error: 'preferredPharmacyDoseSpotId must be a positive integer.' });
    }

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);
        if (requestedPatientUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to sync preferred pharmacy for another patient.' });
        }

        if (preferredPharmacyDoseSpotId || preferredPharmacy) {
            const now = new Date();
            const patch: Record<string, unknown> = {
                ...(preferredPharmacyDoseSpotId ? { preferredPharmacyDoseSpotId } : {}),
                ...(preferredPharmacy ? { preferredPharmacy } : {}),
                updatedAt: now
            };

            await Promise.all([
                admin.firestore().collection('patients').doc(requestedPatientUid).set(patch, { merge: true }),
                admin.firestore().collection('users').doc(requestedPatientUid).set(patch, { merge: true })
            ]);
        }

        const result = await ensureDoseSpotPatientForUid(requestedPatientUid, {
            updateExisting: false,
            onBehalfOfClinicianId: requester.doseSpotClinicianId ?? undefined
        });

        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Patient Sync] Preferred pharmacy sync route failed', {
            requesterUid,
            requestedPatientUid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to sync DoseSpot preferred pharmacy.' });
    }
});

router.post('/patients/delete', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body))
        ? req.body as Record<string, unknown>
        : {};
    const requestedPatientUid = typeof body.patientUid === 'string' && body.patientUid.trim().length > 0
        ? body.patientUid.trim()
        : requesterUid;
    const deactivateAllExactMatches = body.deactivateAllExactMatches === true;
    const candidatePatientIds = Array.isArray(body.candidatePatientIds)
        ? body.candidatePatientIds
            .map((value) => asNumber(value))
            .filter((value): value is number => value !== null && value > 0)
        : [];

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);

        if (requestedPatientUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to delete DoseSpot data for another patient.' });
        }

        const result = await deleteDoseSpotPatientForUid(requestedPatientUid, {
            candidatePatientIds,
            deactivateAllExactMatches
        });

        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Patient Delete] Delete route failed', {
            requesterUid,
            requestedPatientUid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to delete DoseSpot patient link' });
    }
});

router.get('/patients/:patientUid/medication-history', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestedPatientUid = typeof req.params.patientUid === 'string' ? req.params.patientUid.trim() : '';
    if (!requestedPatientUid) {
        return res.status(400).json({ error: 'Missing patientUid route parameter.' });
    }

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);
        if (requestedPatientUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to read DoseSpot workflows for another patient.' });
        }

        const result = await fetchDoseSpotMedicationHistoryForPatientUid(requestedPatientUid, {
            start: typeof req.query.start === 'string' ? req.query.start : undefined,
            end: typeof req.query.end === 'string' ? req.query.end : undefined,
            pageNumber: parsePositiveInt(req.query.pageNumber)
        });

        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Workflow] Failed to load medication history', {
            requesterUid,
            requestedPatientUid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to load DoseSpot medication history.' });
    }
});

router.post('/patients/:patientUid/medication-history/consent', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestedPatientUid = typeof req.params.patientUid === 'string' ? req.params.patientUid.trim() : '';
    if (!requestedPatientUid) {
        return res.status(400).json({ error: 'Missing patientUid route parameter.' });
    }

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);
        if (requestedPatientUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to update DoseSpot workflows for another patient.' });
        }

        const result = await logDoseSpotMedicationHistoryConsentForPatientUid(requestedPatientUid);

        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Workflow] Failed to log medication history consent', {
            requesterUid,
            requestedPatientUid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to log DoseSpot medication-history consent.' });
    }
});

router.get('/patients/:patientUid/prescriptions', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestedPatientUid = typeof req.params.patientUid === 'string' ? req.params.patientUid.trim() : '';
    if (!requestedPatientUid) {
        return res.status(400).json({ error: 'Missing patientUid route parameter.' });
    }

    const statusClassRaw = typeof req.query.statusClass === 'string' ? req.query.statusClass.trim() : '';
    const statusClass = statusClassRaw === 'Active' || statusClassRaw === 'Inactive' || statusClassRaw === 'Pending'
        ? statusClassRaw
        : undefined;

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);
        if (requestedPatientUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to read DoseSpot workflows for another patient.' });
        }

        const result = await fetchDoseSpotPrescriptionSummaryForPatientUid(requestedPatientUid, {
            startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
            endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
            pageNumber: parsePositiveInt(req.query.pageNumber),
            statusClass,
            prescriptionStatus: typeof req.query.prescriptionStatus === 'string' ? req.query.prescriptionStatus : undefined
        });

        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Workflow] Failed to load prescription summary', {
            requesterUid,
            requestedPatientUid,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to load DoseSpot prescription summary.' });
    }
});

router.get('/queues/refills', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestedPatientUid = typeof req.query.patientUid === 'string' && req.query.patientUid.trim().length > 0
        ? req.query.patientUid.trim()
        : undefined;

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);
        if (requestedPatientUid && requestedPatientUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to read DoseSpot workflows for another patient.' });
        }

        const result = await fetchDoseSpotPendingRefillsQueue({
            clinicId: parseClinicScope(req.query.clinicId),
            patientUid: requestedPatientUid,
            pageNumber: parsePositiveInt(req.query.pageNumber)
        });

        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Workflow] Failed to load pending refill queue', {
            requesterUid,
            requestedPatientUid: requestedPatientUid ?? null,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to load DoseSpot refill queue.' });
    }
});

router.get('/queues/rxchanges', verifyFirebaseToken, async (req: Request, res: Response) => {
    const requesterUid = req['user']?.uid;
    if (!requesterUid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestedPatientUid = typeof req.query.patientUid === 'string' && req.query.patientUid.trim().length > 0
        ? req.query.patientUid.trim()
        : undefined;

    try {
        const requester = await resolveDoseSpotRequester(requesterUid, req['user']?.role);
        if (requestedPatientUid && requestedPatientUid !== requesterUid && !canManageOtherPatients(requester.role)) {
            return res.status(403).json({ error: 'Not authorized to read DoseSpot workflows for another patient.' });
        }

        const result = await fetchDoseSpotPendingRxChangesQueue({
            clinicId: parseClinicScope(req.query.clinicId),
            patientUid: requestedPatientUid,
            pageNumber: parsePositiveInt(req.query.pageNumber)
        });

        return res.status(200).json(result);
    } catch (error) {
        logger.error('[DoseSpot Workflow] Failed to load pending RxChange queue', {
            requesterUid,
            requestedPatientUid: requestedPatientUid ?? null,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({ error: 'Failed to load DoseSpot RxChange queue.' });
    }
});

export default router;
