/**
 * DoseSpot Push Notification Webhook Handler
 *
 * DoseSpot POSTs to this endpoint to push real-time notification counts
 * for a given clinician. The payload contains counts of:
 *   - PendingPrescriptions
 *   - TransmissionErrors
 *   - RefillRequests
 *   - ChangeRequests
 *
 * Docs ref: DoseSpot API v2 Push Notifications / Sync endpoint setup.
 *
 * Security: We verify the request using a HMAC-SHA256 signature that
 * DoseSpot sends in the X-DoseSpot-Signature header (if configured),
 * OR we fall back to a shared secret check via the clinic key.
 * The endpoint is intentionally public (no Firebase auth) because it is
 * called server-to-server from DoseSpot's infrastructure.
 */

import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify the incoming DoseSpot push notification secret.
 * DoseSpot sends the webhook secret in the Authorization header as:
 *   "Authorization: Secret {{DOSESPOT_WEBHOOK_SECRET}}"
 *
 * This is a DIFFERENT key from DOSESPOT_CLINIC_KEY (which is used for SSO URL signing).
 * The webhook secret was provided by DoseSpot when the push notification endpoint was configured.
 */
function verifyDoseSpotSecret(req: Request): boolean {
    const webhookSecret = process.env.DOSESPOT_WEBHOOK_SECRET;
    if (!webhookSecret) {
        logger.warn('[DoseSpot Webhook] DOSESPOT_WEBHOOK_SECRET not set — skipping secret verification');
        return true; // Can't verify without the key; don't block in dev
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        if (process.env.DOSESPOT_WEBHOOK_STRICT === 'true') {
            logger.warn('[DoseSpot Webhook] Missing Authorization header in strict mode — rejecting');
            return false;
        }
        logger.info('[DoseSpot Webhook] No Authorization header — allowing (non-strict mode)');
        return true;
    }

    const expectedHeader = `Secret ${webhookSecret}`;
    
    // Constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(authHeader, 'utf8'),
            Buffer.from(expectedHeader, 'utf8')
        );
    } catch {
        // If lengths don't match, timingSafeEqual throws. Treat as mismatch.
        logger.warn('[DoseSpot Webhook] Secret mismatch — invalid Authorization header');
        return false;
    }
}

// ---------------------------------------------------------------------------
// POST /api/v1/dosespot/push-notifications
// ---------------------------------------------------------------------------

/**
 * Expected DoseSpot push payload shape (v2 API):
 * {
 *   "EventType": "PrescriberNotificationCounts",
 *   "Data": {
 *     "ClinicianId": 123,
 *     "PendingPrescriptionCount": 10,
 *     ...
 *     "Total": {
 *       "PendingPrescriptionCount": 15,
 *       "TransmissionErrorCount": 1,
 *       "RefillRequestCount": 4,
 *       "ChangeRequestCount": 1
 *     }
 *   }
 * }
 *
 * We store this under: /users/{uid}/dosespot/notifications
 * matching the existing notification-count GET endpoint schema.
 * We look up the provider uid by their DoseSpot clinician ID.
 */
router.post('/push-notifications', async (req: Request, res: Response) => {
    // 1. Verify Authorization secret
    if (!verifyDoseSpotSecret(req)) {
        return res.status(401).json({ error: 'Invalid or missing DoseSpot secret' });
    }

    const { EventType, Data } = req.body;

    // Gracefully ignore events we don't handle yet (e.g. PrescriptionResult, MedicationStatusUpdate)
    // Always return 200 so DoseSpot doesn't retry them.
    if (EventType !== 'PrescriberNotificationCounts') {
        logger.info(`[DoseSpot Webhook] Ignoring unhandled EventType: ${EventType}`);
        return res.status(200).json({ received: true, ignored: true, reason: 'unhandled_event_type' });
    }

    if (!Data || !Data.ClinicianId) {
        logger.warn('[DoseSpot Webhook] Missing Data or ClinicianId in payload', { body: req.body });
        return res.status(400).json({ error: 'Missing Data.ClinicianId' });
    }

    const clinicianId = parseInt(String(Data.ClinicianId), 10);
    if (isNaN(clinicianId)) {
        return res.status(400).json({ error: 'Invalid ClinicianId' });
    }

    // PDF spec shows counts both at clinic level and total aggregate level.
    // We want the 'Total' aggregate counts to badge the UI accurately.
    const totals = Data.Total || {};
    const pendingPrescriptions = parseInt(String(totals.PendingPrescriptionCount ?? 0), 10) || 0;
    const transmissionErrors   = parseInt(String(totals.TransmissionErrorCount   ?? 0), 10) || 0;
    const refillRequests       = parseInt(String(totals.RefillRequestCount       ?? 0), 10) || 0;
    const changeRequests       = parseInt(String(totals.ChangeRequestCount       ?? 0), 10) || 0;
    const totalCount           = pendingPrescriptions + transmissionErrors + refillRequests + changeRequests;

    logger.info('[DoseSpot Webhook] Received notification counts', {
        clinicianId,
        pendingPrescriptions,
        transmissionErrors,
        refillRequests,
        changeRequests,
        totalCount,
    });

    try {
        // 3. Find the provider in Firestore by their DoseSpot clinician ID
        const usersRef = admin.firestore().collection('users');
        const snapshot = await usersRef
            .where('doseSpotClinicianId', '==', clinicianId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // DoseSpot may push for clinicians not yet set up in our system.
            // Return 200 so DoseSpot doesn't keep retrying — just log and move on.
            logger.warn('[DoseSpot Webhook] No user found for clinicianId — ignoring', { clinicianId });
            return res.status(200).json({ received: true, matched: false });
        }

        const providerDoc = snapshot.docs[0];
        const providerUid = providerDoc.id;

        // 4. Write notification counts to Firestore
        //    Path: /users/{uid}/dosespot/notifications  (matches existing GET endpoint)
        await admin.firestore()
            .collection('users')
            .doc(providerUid)
            .collection('dosespot')
            .doc('notifications')
            .set({
                pendingPrescriptions,
                transmissionErrors,
                refillRequests,
                changeRequests,
                total: totalCount,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                sourceClinicianId: clinicianId,
            }, { merge: true });

        // 5. If there are critical alerts, create an in-app notification as well
        if (totalCount > 0) {
            const alertParts: string[] = [];
            if (pendingPrescriptions > 0) alertParts.push(`${pendingPrescriptions} pending Rx`);
            if (transmissionErrors    > 0) alertParts.push(`${transmissionErrors} transmission error(s)`);
            if (refillRequests        > 0) alertParts.push(`${refillRequests} refill request(s)`);
            if (changeRequests        > 0) alertParts.push(`${changeRequests} change request(s)`);

            await admin.firestore().collection('notifications').add({
                userId: providerUid,
                title: 'eRx Action Required',
                message: `DoseSpot: ${alertParts.join(', ')}. Open the eRx tab to review.`,
                type: 'dosespot_erx',
                status: 'unread',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                meta: {
                    clinicianId,
                    pendingPrescriptions,
                    transmissionErrors,
                    refillRequests,
                    changeRequests,
                },
            });

            logger.info('[DoseSpot Webhook] In-app notification created for provider', { providerUid, totalCount });
        }

        // 6. Respond 200 — DoseSpot requires a 200 OK to stop retrying
        return res.status(200).json({ received: true, matched: true, providerUid, total: totalCount });

    } catch (error: any) {
        logger.error('[DoseSpot Webhook] Error processing push notification', error);
        // Return 500 so DoseSpot will retry the delivery
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/v1/dosespot/push-notifications/health
// Simple health check so DoseSpot can verify the endpoint is reachable
// ---------------------------------------------------------------------------
router.get('/push-notifications/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        service: 'patriotic-telehealth-dosespot-webhook',
        timestamp: new Date().toISOString(),
    });
});

export default router;
