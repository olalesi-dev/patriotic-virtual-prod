import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import {
    enqueueWebhookProcessing,
    ensureDoseSpotTestClinicianForUser,
    extractEventType,
    markWebhookEventFailed,
    markWebhookEventQueued,
    persistWebhookEvent,
    processWebhookEvent,
    scheduleInlineWebhookProcessing,
    triggerDoseSpotDevTestActivity,
    verifyDoseSpotSecret,
    verifyDoseSpotTaskRequest
} from '../services/dosespot-push';
import { ensureDoseSpotPatientForUid } from '../services/dosespot-patients';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();

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

        if (persisted.shouldEnqueue) {
            const enqueueResult = await enqueueWebhookProcessing(persisted.eventId);
            await markWebhookEventQueued(persisted.eventId, enqueueResult);

            if (enqueueResult.mode === 'inline_fallback') {
                scheduleInlineWebhookProcessing(persisted.eventId);
            }
        }

        return res.status(200).json({
            received: true,
            eventId: persisted.eventId,
            eventType: persisted.eventType,
            duplicate: persisted.duplicate,
            queued: persisted.shouldEnqueue
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
        timestamp: new Date().toISOString()
    });
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

    const body = (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body))
        ? req.body as Record<string, unknown>
        : {};
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
            updateExisting,
            onBehalfOfClinicianId: requester.doseSpotClinicianId ?? undefined
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

export default router;
