import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { verifyFirebaseToken } from '../middleware/auth';
import {
    fetchVouchedJob,
    findUidForVouchedJob,
    persistVouchedJobResult,
    verifyVouchedWebhookSignature,
} from '../services/vouched';

const router = Router();

function getRawBody(req: Request): string {
    const request = req as Request & { rawBody?: string };
    return typeof request.rawBody === 'string' ? request.rawBody : '';
}

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

router.post('/jobs/complete', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = typeof req['user']?.uid === 'string' ? req['user'].uid : '';
    const jobId = typeof req.body?.jobId === 'string' ? req.body.jobId.trim() : '';

    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!jobId) {
        return res.status(400).json({ error: 'Missing Vouched job id.' });
    }

    try {
        const job = await fetchVouchedJob(jobId);
        const matchedUid = await findUidForVouchedJob(job);

        if (matchedUid && matchedUid !== uid) {
            return res.status(403).json({ error: 'Verification job does not belong to the authenticated user.' });
        }

        const result = await persistVouchedJobResult(uid, job);
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[Vouched] Failed to finalize authenticated job', {
            uid,
            jobId,
            error: getErrorMessage(error, 'Unknown Vouched completion error'),
        });
        return res.status(500).json({ error: 'Failed to finalize identity verification.' });
    }
});

/**
 * POST /api/v1/vouched/webhook
 * Public endpoint that receives status updates from Vouched.id
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const signatureHeader = typeof req.headers['x-signature'] === 'string'
            ? req.headers['x-signature']
            : undefined;
        const rawBody = getRawBody(req);
        if (!verifyVouchedWebhookSignature(rawBody, signatureHeader)) {
            return res.status(401).json({ error: 'Invalid Vouched signature' });
        }

        const payload = req.body;
        const jobId = payload.id; // Vouched usually sends the job ID under 'id'

        if (!jobId) {
            return res.status(400).json({ error: 'Missing Job ID in webhook payload' });
        }

        logger.info(`Received Vouched webhook for Job ID: ${jobId}`);

        const job = await fetchVouchedJob(String(jobId));
        const uid = await findUidForVouchedJob(job);

        if (!uid) {
            logger.warn('[Vouched] Webhook received before a user correlation was available', { jobId });
            return res.status(202).json({ accepted: true, matched: false, jobId });
        }

        const result = await persistVouchedJobResult(uid, job);
        logger.info('[Vouched] Successfully processed webhook', {
            uid,
            jobId: result.jobId,
            status: result.status,
            verified: result.verified,
        });

        return res.status(200).json({ success: true, verified: result.verified, status: result.status });

    } catch (error) {
        logger.error('[Vouched] Error processing webhook', {
            error: getErrorMessage(error, 'Unknown webhook error'),
        });
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
