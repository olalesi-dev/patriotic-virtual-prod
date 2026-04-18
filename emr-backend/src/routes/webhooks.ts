import { Router } from 'express';
import { isStripeConfigured, stripe } from '../config/stripe';
import { completeTelehealthConsultationPayment } from '../services/consultation-payments';
import { logger } from '../utils/logger';

const router = Router();

router.post('/stripe', async (req, res) => {
    if (!isStripeConfigured || !stripe) {
        return res.status(503).json({ error: 'Payment service unavailable', code: 'STRIPE_NOT_CONFIGURED' });
    }

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!signature || typeof signature !== 'string' || !webhookSecret) {
        return res.status(400).json({ error: 'Missing Stripe webhook configuration' });
    }

    try {
        const event = stripe.webhooks.constructEvent(req.rawBody ?? '', signature, webhookSecret);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const consultationId = typeof session.metadata?.consultationId === 'string' ? session.metadata.consultationId.trim() : '';
            const uid = typeof session.metadata?.uid === 'string' ? session.metadata.uid.trim() : '';

            if (consultationId && uid) {
                await completeTelehealthConsultationPayment({
                    consultationId,
                    uid,
                    stripeSessionId: session.id,
                });
            }
        }

        return res.json({ received: true });
    } catch (error) {
        logger.error('Stripe webhook processing failed', { error });
        return res.status(400).json({ error: error instanceof Error ? error.message : 'Webhook Error' });
    }
});

export default router;
