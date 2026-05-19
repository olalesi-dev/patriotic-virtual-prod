import { Router } from 'express';
import type { Request, Response } from 'express';
import { DEFAULT_MARKETING_ORIGIN, normalizeAbsoluteUrl } from '../config/app-origins';
import { firebaseAuth } from '../config/firebase';
import { isStripeConfigured, stripe } from '../config/stripe';
import {
    completePaidSignup,
    createPaidIntakeCheckout,
    createPaidSignupToken,
    getPaidSignupErrorCode,
    getPaidSignupStatusCode,
} from '../services/paid-intake-signup';
import { logger } from '../utils/logger';

const router = Router();

function resolveMarketingBaseUrl(req: Request): string {
    void req;
    return normalizeAbsoluteUrl(process.env.MARKETING_URL) ?? DEFAULT_MARKETING_ORIGIN;
}

function requireStripeConfigured(res: Response) {
    if (stripe && isStripeConfigured) {
        return stripe;
    }

    res.status(503).json({
        error: 'Stripe is not configured for the backend runtime',
        code: 'STRIPE_NOT_CONFIGURED',
    });
    return null;
}

async function getAuthenticatedUid(req: Request): Promise<string | null> {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!token) return null;

    try {
        const decoded = await firebaseAuth.verifyIdToken(token);
        return decoded.uid || null;
    } catch {
        const error = new Error('Invalid authentication token.');
        (error as Error & { statusCode?: number }).statusCode = 401;
        throw error;
    }
}

router.post('/intake-checkout', async (req, res) => {
    try {
        const stripeClient = requireStripeConfigured(res);
        if (!stripeClient) return;

        const {
            serviceKey,
            intake,
            screening,
            returnUrl,
            cancelUrl,
        } = req.body as {
            serviceKey?: string;
            intake?: unknown;
            screening?: unknown;
            returnUrl?: string | null;
            cancelUrl?: string | null;
        };

        const checkout = await createPaidIntakeCheckout({
            stripeClient,
            serviceKey: serviceKey || '',
            intake,
            screening,
            returnUrl,
            cancelUrl,
            baseUrl: resolveMarketingBaseUrl(req),
        });

        return res.json(checkout);
    } catch (error) {
        logger.error('Paid intake checkout error', { error });
        return res.status(getPaidSignupStatusCode(error)).json({
            error: error instanceof Error ? error.message : 'Internal server error',
            code: getPaidSignupErrorCode(error),
        });
    }
});

router.get('/intake-checkout/status', async (req, res) => {
    try {
        const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : '';
        const intakeCheckoutId = typeof req.query.intakeCheckoutId === 'string' ? req.query.intakeCheckoutId : null;
        const status = await createPaidSignupToken(sessionId, intakeCheckoutId);
        return res.json(status);
    } catch (error) {
        logger.error('Paid intake status error', { error });
        return res.status(getPaidSignupStatusCode(error)).json({
            error: error instanceof Error ? error.message : 'Internal server error',
            code: getPaidSignupErrorCode(error),
        });
    }
});

router.post('/complete-paid-signup', async (req, res) => {
    try {
        const authenticatedUid = await getAuthenticatedUid(req);
        const {
            sessionId,
            intakeCheckoutId,
            signupToken,
            registration,
        } = req.body as {
            sessionId?: string;
            intakeCheckoutId?: string | null;
            signupToken?: string | null;
            registration?: unknown;
        };

        if (!sessionId) {
            return res.status(400).json({ error: 'Missing Stripe checkout session ID.' });
        }

        const result = await completePaidSignup({
            sessionId,
            intakeCheckoutId,
            signupToken,
            registration,
            authenticatedUid,
        });

        return res.json(result);
    } catch (error) {
        logger.error('Complete paid signup error', { error });
        return res.status(getPaidSignupStatusCode(error)).json({
            error: error instanceof Error ? error.message : 'Internal server error',
            code: getPaidSignupErrorCode(error),
        });
    }
});

export default router;
