import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq } from 'drizzle-orm';
import {
  CONSULTATION_CATALOG,
  DEFAULT_MEETING_URL,
  DEFAULT_APP_URL,
  buildCheckoutRedirectUrl,
  normalizeAbsoluteUrl,
} from '@workspace/common';
import { stripe, isStripeConfigured } from './stripe';
import { env } from '@workspace/env';

function buildReason(serviceKey: string | undefined, fallbackReason: unknown) {
  if (serviceKey && CONSULTATION_CATALOG[serviceKey]) {
    return CONSULTATION_CATALOG[serviceKey].name;
  }

  if (typeof fallbackReason === 'string' && fallbackReason.trim().length > 0) {
    return fallbackReason.trim();
  }

  return serviceKey || 'Consultation';
}

export async function completeConsultationPayment(args: {
  consultationId: string;
  patientId: string;
  stripeSessionId: string;
}) {
  const { consultationId, patientId, stripeSessionId } = args;

  return await db.transaction(async (tx) => {
    const [consultation] = await tx
      .select()
      .from(schema.consultations)
      .where(eq(schema.consultations.id, consultationId))
      .limit(1);

    if (!consultation) {
      throw new Error('Consultation not found');
    }

    const [patient] = await tx
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, patientId))
      .limit(1);

    const reason = buildReason(consultation.serviceKey, undefined);

    // Update consultation
    await tx
      .update(schema.consultations)
      .set({
        paymentStatus: 'paid',
        status: 'waitlist',
        stripeSessionId,
        updatedAt: new Date(),
      })
      .where(eq(schema.consultations.id, consultationId));

    // Create or update appointment
    const [existingAppointment] = await tx
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.consultationId, consultationId))
      .limit(1);

    const appointmentPayload = {
      patientId,
      consultationId,
      type: 'Telehealth',
      status: 'pending_scheduling',
      reason,
      meetingUrl: DEFAULT_MEETING_URL,
      updatedAt: new Date(),
    };

    let appointment;
    if (existingAppointment) {
      [appointment] = await tx
        .update(schema.appointments)
        .set(appointmentPayload)
        .where(eq(schema.appointments.id, existingAppointment.id))
        .returning();
    } else {
      [appointment] = await tx
        .insert(schema.appointments)
        .values({
          ...appointmentPayload,
          createdAt: new Date(),
        })
        .returning();
    }

    return {
      consultation,
      appointment,
      patient,
    };
  });
}

export function buildStripeLineItem(serviceKey: string) {
  const item = CONSULTATION_CATALOG[serviceKey];
  if (!item) {
    throw new Error(`Invalid service: ${serviceKey}`);
  }

  return {
    quantity: 1,
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: item.amount,
      ...(item.interval
        ? {
            recurring: {
              interval: item.interval as 'day' | 'week' | 'month' | 'year',
            },
          }
        : {}),
    },
  };
}

export async function createConsultation(args: {
  userId: string;
  serviceKey: string;
  intake: Record<string, any>;
  organizationId: string;
}) {
  const { userId, serviceKey, intake, organizationId } = args;

  return await db.transaction(async (tx) => {
    // 1. Get or create patient profile
    let [patient] = await tx
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.userId, userId))
      .limit(1);

    const firstName = String(intake.firstName || intake.first_name || 'Patient');
    const lastName = String(intake.lastName || intake.last_name || '');

    if (!patient) {
      [patient] = await tx
        .insert(schema.patients)
        .values({
          userId,
          firstName,
          lastName,
          organizationId,
          dateOfBirth: intake.dateOfBirth || intake.dob,
          state: intake.state,
          email: intake.email,
          updatedAt: new Date(),
        })
        .returning();
    } else {
      [patient] = await tx
        .update(schema.patients)
        .set({
          firstName,
          lastName,
          dateOfBirth: intake.dateOfBirth || intake.dob || patient.dateOfBirth,
          state: intake.state || patient.state,
          email: intake.email || patient.email,
          updatedAt: new Date(),
        })
        .where(eq(schema.patients.id, patient.id))
        .returning();
    }

    // 2. Create consultation
    const [consultation] = await tx
      .insert(schema.consultations)
      .values({
        patientId: patient.id,
        serviceKey,
        intakeAnswers: intake,
        status: 'pending_payment',
        paymentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { consultation, patient };
  });
}

export async function createStripeCheckoutSession(args: {
  userId: string;
  consultationId: string;
  serviceKey: string;
  returnUrl?: string;
  cancelUrl?: string;
  origin?: string;
}) {
  if (!stripe || !isStripeConfigured) {
    throw new Error('Stripe is not configured');
  }

  const { userId, consultationId, serviceKey, returnUrl, cancelUrl, origin } =
    args;

  const [consultation] = await db
    .select()
    .from(schema.consultations)
    .where(eq(schema.consultations.id, consultationId))
    .limit(1);

  if (!consultation) {
    throw new Error('Consultation not found');
  }

  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, consultation.patientId!))
    .limit(1);

  if (!patient || patient.userId !== userId) {
    throw new Error('Unauthorized');
  }

  const baseUrl =
    normalizeAbsoluteUrl(env.CORS_ORIGIN) ||
    normalizeAbsoluteUrl(origin) ||
    DEFAULT_APP_URL;

  const lineItem = buildStripeLineItem(serviceKey);
  const item = CONSULTATION_CATALOG[serviceKey];

  const session = await stripe.checkout.sessions.create({
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
      patientId: patient.id,
      userId,
    },
    billing_address_collection: 'required',
  });

  return { sessionId: session.id, url: session.url };
}
