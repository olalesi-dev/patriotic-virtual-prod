import { Router } from 'express';
import { isStripeConfigured, stripe } from '../config/stripe';
import { firestore } from '../config/firebase';
import { notifyFailedPayment, notifyPriorityQueuePaymentSuccess } from '../modules/notifications/producers';
import { completeTelehealthConsultationPayment } from '../services/consultation-payments';
import {
    markPaidIntakeCheckoutBillingEventByPaymentIntent,
    markPaidIntakeCheckoutFailedFromStripeSession,
    markPaidIntakeCheckoutFromStripeSession,
    markPaidIntakeCheckoutSubscriptionEvent,
} from '../services/paid-intake-signup';
import { logger } from '../utils/logger';

const router = Router();
const STALE_WEBHOOK_PROCESSING_MS = 1000 * 60 * 10;

function getStripeObjectId(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value && typeof (value as { id?: unknown }).id === 'string') {
        return (value as { id: string }).id;
    }
    return null;
}

function getSubscriptionBillingStatus(subscriptionStatus: unknown): string {
    if (subscriptionStatus === 'active') return 'paid';
    if (subscriptionStatus === 'trialing') return 'trialing';
    if (subscriptionStatus === 'past_due') return 'past_due';
    if (subscriptionStatus === 'unpaid') return 'unpaid';
    if (subscriptionStatus === 'canceled') return 'canceled';
    if (subscriptionStatus === 'incomplete') return 'incomplete';
    if (subscriptionStatus === 'incomplete_expired') return 'incomplete_expired';
    return typeof subscriptionStatus === 'string' && subscriptionStatus.trim()
        ? subscriptionStatus.trim()
        : 'unknown';
}

async function beginStripeWebhookProcessing(eventId: string, eventType: string): Promise<boolean> {
    const eventRef = firestore.collection('stripe_webhook_events').doc(eventId);

    return firestore.runTransaction(async (transaction) => {
        const eventSnap = await transaction.get(eventRef);
        const status = eventSnap.exists ? eventSnap.data()?.processingStatus : null;
        const updatedAtValue = eventSnap.exists ? eventSnap.data()?.updatedAt : null;
        const updatedAt = updatedAtValue && typeof updatedAtValue.toDate === 'function'
            ? updatedAtValue.toDate()
            : updatedAtValue instanceof Date
                ? updatedAtValue
                : null;
        const isFreshProcessing = status === 'processing'
            && updatedAt
            && Date.now() - updatedAt.getTime() < STALE_WEBHOOK_PROCESSING_MS;
        if (status === 'processed' || isFreshProcessing) {
            return false;
        }

        transaction.set(eventRef, {
            stripeEventId: eventId,
            eventType,
            processingStatus: 'processing',
            updatedAt: new Date(),
            createdAt: eventSnap.exists ? eventSnap.data()?.createdAt : new Date(),
        }, { merge: true });

        return true;
    });
}

async function finishStripeWebhookProcessing(eventId: string) {
    await firestore.collection('stripe_webhook_events').doc(eventId).set({
        processingStatus: 'processed',
        processedAt: new Date(),
        updatedAt: new Date(),
        errorMessage: null,
    }, { merge: true });
}

async function failStripeWebhookProcessing(eventId: string, error: unknown) {
    await firestore.collection('stripe_webhook_events').doc(eventId).set({
        processingStatus: 'failed',
        updatedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
    }, { merge: true });
}

router.post('/stripe', async (req, res) => {
    if (!isStripeConfigured || !stripe) {
        return res.status(503).json({ error: 'Payment service unavailable', code: 'STRIPE_NOT_CONFIGURED' });
    }

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!signature || typeof signature !== 'string' || !webhookSecret) {
        return res.status(400).json({ error: 'Missing Stripe webhook configuration' });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody ?? '', signature, webhookSecret);
    } catch (error) {
        logger.error('Stripe webhook signature verification failed', { error });
        return res.status(400).json({ error: error instanceof Error ? error.message : 'Webhook Error' });
    }

    const shouldProcess = await beginStripeWebhookProcessing(event.id, event.type);
    if (!shouldProcess) {
        return res.json({ received: true, deduped: true });
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const handledPaidSignup = await markPaidIntakeCheckoutFromStripeSession(session);
            if (handledPaidSignup) {
                await finishStripeWebhookProcessing(event.id);
                return res.json({ received: true });
            }

            const consultationId = typeof session.metadata?.consultationId === 'string' ? session.metadata.consultationId.trim() : '';
            const uid = typeof session.metadata?.uid === 'string' ? session.metadata.uid.trim() : '';

            if (consultationId && uid) {
                const consultationData = await completeTelehealthConsultationPayment({
                    consultationId,
                    uid,
                    stripeSessionId: session.id,
                });

                await notifyPriorityQueuePaymentSuccess({
                    appointmentId: consultationId,
                    patientId: uid,
                    patientName: typeof consultationData.patient === 'string' ? consultationData.patient : 'Patient',
                    serviceName: typeof consultationData.serviceKey === 'string' ? consultationData.serviceKey : 'Consultation',
                    requestedAt: new Date(),
                    appointmentReason: typeof consultationData.reason === 'string'
                        ? consultationData.reason
                        : typeof consultationData.serviceKey === 'string'
                            ? consultationData.serviceKey
                            : 'Consultation request',
                });
            }
        } else if (event.type === 'checkout.session.async_payment_succeeded') {
            await markPaidIntakeCheckoutFromStripeSession(event.data.object);
        } else if (event.type === 'checkout.session.async_payment_failed') {
            await markPaidIntakeCheckoutFailedFromStripeSession(event.data.object, 'failed');
        } else if (event.type === 'checkout.session.expired') {
            await markPaidIntakeCheckoutFailedFromStripeSession(event.data.object, 'expired');
        } else if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object;
            const invoiceRecord = invoice as Record<string, any>;
            const metadataUid = typeof invoice.metadata?.uid === 'string' ? invoice.metadata.uid.trim() : '';
            const patientEmail = typeof invoice.customer_email === 'string' ? invoice.customer_email.trim() : '';
            const patientName = typeof invoice.customer_name === 'string' ? invoice.customer_name.trim() : '';
            const subscriptionId = getStripeObjectId(
                invoiceRecord.subscription
                ?? invoiceRecord.parent?.subscription_details?.subscription,
            );

            await notifyFailedPayment({
                chargeId: invoice.id,
                patientId: metadataUid || null,
                patientEmail: patientEmail || null,
                patientName: patientName || null,
                amountInCents: typeof invoice.amount_due === 'number' ? invoice.amount_due : null,
            });

            await markPaidIntakeCheckoutSubscriptionEvent({
                subscriptionId,
                billingStatus: 'past_due',
                subscriptionStatus: 'past_due',
                invoiceId: typeof invoice.id === 'string' ? invoice.id : null,
            });
        } else if (event.type === 'invoice.paid') {
            const invoice = event.data.object;
            const invoiceRecord = invoice as Record<string, any>;
            const subscriptionId = getStripeObjectId(
                invoiceRecord.subscription
                ?? invoiceRecord.parent?.subscription_details?.subscription,
            );
            await markPaidIntakeCheckoutSubscriptionEvent({
                subscriptionId,
                billingStatus: 'paid',
                subscriptionStatus: 'active',
                invoiceId: typeof invoice.id === 'string' ? invoice.id : null,
            });
        } else if (event.type === 'charge.failed') {
            const charge = event.data.object;
            const metadataUid = typeof charge.metadata?.uid === 'string' ? charge.metadata.uid.trim() : '';
            const patientEmail = typeof charge.billing_details?.email === 'string' ? charge.billing_details.email.trim() : '';
            const patientName = typeof charge.billing_details?.name === 'string' ? charge.billing_details.name.trim() : '';

            await notifyFailedPayment({
                chargeId: charge.id,
                patientId: metadataUid || null,
                patientEmail: patientEmail || null,
                patientName: patientName || null,
                amountInCents: typeof charge.amount === 'number' ? charge.amount : null,
            });
        } else if (event.type === 'charge.refunded') {
            const charge = event.data.object;
            const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
            await markPaidIntakeCheckoutBillingEventByPaymentIntent({
                paymentIntentId,
                billingStatus: 'refunded',
                amountRefunded: typeof charge.amount_refunded === 'number' ? charge.amount_refunded : null,
            });
        } else if (event.type === 'charge.dispute.created') {
            const dispute = event.data.object;
            const paymentIntentId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;
            await markPaidIntakeCheckoutBillingEventByPaymentIntent({
                paymentIntentId,
                billingStatus: 'disputed',
                disputeId: typeof dispute.id === 'string' ? dispute.id : null,
            });
        } else if (event.type === 'customer.subscription.updated') {
            const subscription = event.data.object;
            const subscriptionRecord = subscription as Record<string, any>;
            const subscriptionStatus = typeof subscription.status === 'string' ? subscription.status : null;
            await markPaidIntakeCheckoutSubscriptionEvent({
                subscriptionId: typeof subscription.id === 'string' ? subscription.id : null,
                billingStatus: getSubscriptionBillingStatus(subscriptionStatus),
                subscriptionStatus,
                cancelAtPeriodEnd: typeof subscription.cancel_at_period_end === 'boolean'
                    ? subscription.cancel_at_period_end
                    : null,
                currentPeriodEnd: typeof subscriptionRecord.current_period_end === 'number'
                    ? subscriptionRecord.current_period_end
                    : null,
            });
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const subscriptionRecord = subscription as Record<string, any>;
            await markPaidIntakeCheckoutSubscriptionEvent({
                subscriptionId: typeof subscription.id === 'string' ? subscription.id : null,
                billingStatus: 'canceled',
                subscriptionStatus: typeof subscription.status === 'string' ? subscription.status : 'canceled',
                cancelAtPeriodEnd: typeof subscription.cancel_at_period_end === 'boolean'
                    ? subscription.cancel_at_period_end
                    : null,
                currentPeriodEnd: typeof subscriptionRecord.current_period_end === 'number'
                    ? subscriptionRecord.current_period_end
                    : null,
            });
        }

        await finishStripeWebhookProcessing(event.id);
        return res.json({ received: true });
    } catch (error) {
        await failStripeWebhookProcessing(event.id, error);
        logger.error('Stripe webhook processing failed', { error });
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Webhook Error' });
    }
});

export default router;
