import { Router } from 'express';
import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { firestore } from '../config/firebase';
import { isStripeConfigured, stripe } from '../config/stripe';
import {
    buildStripeLineItem,
    completeTelehealthConsultationPayment,
    CONSULTATION_CATALOG,
} from '../services/consultation-payments';
import { buildCheckoutRedirectUrl, normalizeAbsoluteUrl } from '../utils/stripe-checkout-urls';
import { logger } from '../utils/logger';

const DEFAULT_APP_URL = 'https://patriotic-virtual-emr.web.app';
const router = Router();

function resolveCheckoutBaseUrl(req: Request): string {
    return normalizeAbsoluteUrl(process.env.FRONTEND_URL)
        ?? normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL)
        ?? normalizeAbsoluteUrl(req.get('origin'))
        ?? DEFAULT_APP_URL;
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

router.post('/create-checkout-session', async (req, res) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const stripeClient = requireStripeConfigured(res);
        if (!stripeClient) return;

        const {
            serviceKey,
            consultationId,
            returnUrl,
            cancelUrl,
        } = req.body as {
            serviceKey?: string;
            consultationId?: string;
            returnUrl?: string | null;
            cancelUrl?: string | null;
        };

        if (!serviceKey || !consultationId) {
            return res.status(400).json({ error: 'Missing serviceKey or consultationId' });
        }

        if (!CONSULTATION_CATALOG[serviceKey]) {
            return res.status(400).json({ error: `Invalid service: ${serviceKey}` });
        }

        const consultationSnap = await firestore.collection('consultations').doc(consultationId).get();
        if (!consultationSnap.exists) {
            return res.status(404).json({ error: 'Consultation not found' });
        }

        const consultationData = consultationSnap.data() ?? {};
        const consultationOwnerUid = typeof consultationData.uid === 'string' ? consultationData.uid.trim() : '';
        if (!consultationOwnerUid || consultationOwnerUid !== uid) {
            return res.status(403).json({ error: 'Not authorized for this consultation' });
        }

        const baseUrl = resolveCheckoutBaseUrl(req);
        const lineItem = buildStripeLineItem(serviceKey);
        const item = CONSULTATION_CATALOG[serviceKey];

        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            allow_promotion_codes: true,
            line_items: [lineItem],
            mode: item.interval ? 'subscription' : 'payment',
            success_url: buildCheckoutRedirectUrl({
                baseUrl,
                targetUrl: returnUrl,
                consultationId,
                sessionId: '{CHECKOUT_SESSION_ID}',
                paymentStatus: 'success',
            }),
            cancel_url: buildCheckoutRedirectUrl({
                baseUrl,
                targetUrl: cancelUrl,
                sessionId: '{CHECKOUT_SESSION_ID}',
                paymentStatus: 'cancelled',
            }),
            metadata: {
                serviceKey,
                consultationId,
                uid,
            },
            billing_address_collection: 'required',
        };

        const session = await stripeClient.checkout.sessions.create(sessionConfig);
        return res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        logger.error('Checkout session error', { error });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});

router.post('/confirm-telehealth-session', async (req, res) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const stripeClient = requireStripeConfigured(res);
        if (!stripeClient) return;

        const { sessionId, consultationId } = req.body as {
            sessionId?: string;
            consultationId?: string;
        };

        if (!sessionId || !consultationId) {
            return res.status(400).json({ error: 'Missing sessionId or consultationId' });
        }

        const consultationSnap = await firestore.collection('consultations').doc(consultationId).get();
        if (!consultationSnap.exists) {
            return res.status(404).json({ error: 'Consultation not found' });
        }

        const consultationData = consultationSnap.data() ?? {};
        const consultationOwnerUid = typeof consultationData.uid === 'string' ? consultationData.uid.trim() : '';
        if (!consultationOwnerUid || consultationOwnerUid !== uid) {
            return res.status(403).json({ error: 'Not authorized for this consultation' });
        }

        const session = await stripeClient.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not successful yet' });
        }

        const metadataUid = typeof session.metadata?.uid === 'string' ? session.metadata.uid.trim() : '';
        const metadataConsultationId = typeof session.metadata?.consultationId === 'string' ? session.metadata.consultationId.trim() : '';

        if ((metadataUid && metadataUid !== uid) || (metadataConsultationId && metadataConsultationId !== consultationId)) {
            return res.status(403).json({ error: 'Not authorized for this payment session' });
        }

        await completeTelehealthConsultationPayment({
            consultationId,
            uid,
            stripeSessionId: session.id,
        });

        return res.json({ success: true });
    } catch (error) {
        logger.error('Telehealth checkout confirm error', { error });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});

export default router;
