import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { verifyFirebaseToken } from '../middleware/auth';
import {
    fetchVouchedJob,
    findUidForVouchedJob,
    persistVouchedJobResult,
    runVouchedStepUpWorkflow,
    verifyVouchedWebhookSignature,
    type VouchedWorkflowInput,
} from '../services/vouched';

const router = Router();

function getRawBody(req: Request): string {
    const request = req as Request & { rawBody?: string };
    return typeof request.rawBody === 'string' ? request.rawBody : '';
}

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function asBodyRecord(req: Request): Record<string, unknown> {
    return req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body as Record<string, unknown>
        : {};
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function getClientIp(req: Request): string | null {
    const forwardedFor = req.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const firstForwardedIp = forwardedValue?.split(',')[0]?.trim();
    return firstForwardedIp || asString(req.headers['x-real-ip']) || req.ip || null;
}

function buildWorkflowInput(req: Request): VouchedWorkflowInput {
    const body = asBodyRecord(req);
    const addressObject = asRecord(body.address);
    const addressString = asString(body.address);

    return {
        firstName: asString(body.firstName),
        lastName: asString(body.lastName),
        email: asString(body.email),
        phone: asString(body.phone),
        dob: asString(body.dob) ?? asString(body.dateOfBirth),
        address1: asString(body.address1)
            ?? asString(addressObject?.streetAddress)
            ?? asString(addressObject?.address1)
            ?? addressString,
        unit: asString(body.unit) ?? asString(addressObject?.unit),
        city: asString(body.city) ?? asString(addressObject?.city),
        state: asString(body.state) ?? asString(addressObject?.state),
        postalCode: asString(body.postalCode)
            ?? asString(body.zipCode)
            ?? asString(body.zip)
            ?? asString(addressObject?.postalCode)
            ?? asString(addressObject?.zipCode)
            ?? asString(addressObject?.zip),
        country: asString(body.country) ?? asString(addressObject?.country),
        ipAddress: asString(body.ipAddress) ?? getClientIp(req),
    };
}

router.post('/workflow/start', verifyFirebaseToken, async (req: Request, res: Response) => {
    const uid = typeof req['user']?.uid === 'string' ? req['user'].uid : '';
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await runVouchedStepUpWorkflow(uid, buildWorkflowInput(req));
        return res.status(200).json(result);
    } catch (error) {
        logger.error('[Vouched] Failed to run step-up workflow', {
            uid,
            error: getErrorMessage(error, 'Unknown Vouched workflow error'),
        });
        return res.status(500).json({ error: 'Failed to run identity verification workflow.' });
    }
});

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
