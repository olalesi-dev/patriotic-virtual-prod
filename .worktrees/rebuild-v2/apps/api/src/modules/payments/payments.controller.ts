import { Elysia, t } from 'elysia';
import { stripe, isStripeConfigured } from './stripe';
import { env } from '@workspace/env/index';
import {
  NotificationProducers,
  NotificationService,
} from '@workspace/notifications/index';
import { NotificationQueue } from '@workspace/queue/index';
import { db } from '../../db';
import {
  completeConsultationPayment,
  createStripeCheckoutSession,
} from './consultation-payments.service';
import { ShopService } from '../shop/shop.service';
import { authMacro } from '../auth/macro';
import { ForbiddenException, NotFoundException } from '../../utils/errors';

const queue = new NotificationQueue();
const notificationService = new NotificationService(db, queue);
const producers = new NotificationProducers(db, notificationService);
const shopService = new ShopService();

export const paymentsController = new Elysia({ prefix: '/payments' })
  .use(authMacro)
  .post(
    '/stripe/webhook',
    async ({ request, headers, set }) => {
      if (!isStripeConfigured || !stripe) {
        set.status = 503;
        return { error: 'Payment service unavailable' };
      }

      const signature = headers['stripe-signature'];
      const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

      if (!signature || !webhookSecret) {
        set.status = 400;
        return { error: 'Missing Stripe webhook configuration' };
      }

      try {
        const rawBody = await request.text();
        const event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret,
        );

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as any;
          const patientId = session.metadata?.patientId;

          // Handle Consultation
          if (session.metadata?.consultationId) {
            const consultationId = session.metadata.consultationId;

            if (consultationId && patientId) {
              const { consultation, patient } = await completeConsultationPayment({
                consultationId,
                patientId,
                stripeSessionId: session.id,
              });

              await producers.notifyPriorityQueuePaymentSuccess({
                appointmentId: consultation.id,
                patientId: patientId,
                patientName: patient
                  ? `${patient.firstName} ${patient.lastName}`
                  : 'Patient',
                serviceName: consultation.serviceKey,
                requestedAt: new Date(),
              });
            }
          }
          // Handle Shop Order
          else if (session.metadata?.orderId) {
            const orderId = session.metadata.orderId;

            if (orderId && patientId) {
              await shopService.completeShopOrderPayment({
                orderId,
                patientId,
                stripeSessionId: session.id,
              });
            }
          }
        } else if (event.type === 'charge.failed') {
          const charge = event.data.object;
          const patientId =
            typeof charge.metadata?.patientId === 'string'
              ? charge.metadata.patientId.trim()
              : '';
          const patientEmail =
            typeof charge.billing_details?.email === 'string'
              ? charge.billing_details.email.trim()
              : '';
          const patientName =
            typeof charge.billing_details?.name === 'string'
              ? charge.billing_details.name.trim()
              : '';

          await producers.notifyFailedPayment({
            chargeId: charge.id,
            patientId: patientId || null,
            patientEmail: patientEmail || null,
            patientName: patientName || null,
            amountInCents:
              typeof charge.amount === 'number' ? charge.amount : null,
          });
        }

        return { received: true };
      } catch (error) {
        const { message } = error as Error;
        set.status = 400;
        return { error: message };
      }
    },
    {
      detail: {
        summary: 'Stripe Webhook Handler',
        tags: ['Payments'],
      },
    },
  )
  .post(
    '/create-checkout-session',
    async ({ body, user, headers }) => {
      return await createStripeCheckoutSession({
        userId: user.id,
        serviceKey: body.serviceKey,
        consultationId: body.consultationId,
        returnUrl: body.returnUrl,
        cancelUrl: body.cancelUrl,
        origin: headers['origin'],
      });
    },
    {
      isSignIn: true,
      body: t.Object({
        serviceKey: t.String(),
        consultationId: t.String(),
        returnUrl: t.Optional(t.String()),
        cancelUrl: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Create Stripe Checkout Session',
        tags: ['Payments'],
      },
    },
  )
  .post(
    '/confirm-telehealth-session',
    async ({ body, user }) => {
      if (!isStripeConfigured || !stripe) {
        throw new Error('Payment service unavailable');
      }

      const { sessionId, consultationId } = body;

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        throw new ForbiddenException('Payment not successful yet');
      }

      const metadataUserId = session.metadata?.userId;
      const metadataConsultationId = session.metadata?.consultationId;

      if (metadataUserId !== user.id || metadataConsultationId !== consultationId) {
        throw new ForbiddenException('Not authorized for this payment session');
      }

      const patientId = session.metadata?.patientId;
      if (!patientId) {
        throw new NotFoundException('Patient context missing from session');
      }

      await completeConsultationPayment({
        consultationId,
        patientId,
        stripeSessionId: session.id,
      });

      return { success: true };
    },
    {
      isSignIn: true,
      body: t.Object({
        sessionId: t.String(),
        consultationId: t.String(),
      }),
      detail: {
        summary: 'Confirm Telehealth Payment Session',
        tags: ['Payments'],
      },
    },
  );
