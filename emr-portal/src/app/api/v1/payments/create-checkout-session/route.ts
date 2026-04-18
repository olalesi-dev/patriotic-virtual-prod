import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { db, auth } from '@/lib/firebase-admin';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
  : null;

// Mirrors the backend CATALOG
const CATALOG: Record<string, { name: string; amount: number; interval?: string }> = {
  general_visit: { name: 'General Visit', amount: 7900 },
  weight_loss: { name: 'GLP-1 & Weight Loss', amount: 12900 },
  erectile_dysfunction: { name: 'Erectile Dysfunction', amount: 7900 },
  premature_ejaculation: { name: 'Premature Ejaculation', amount: 7900 },

  ai_imaging: { name: 'AI-Powered Imaging Analysis', amount: 9900 },
  report_interpretation: { name: 'Report Interpretation', amount: 14900 },
  standard_imaging: { name: 'Standard Imaging Review', amount: 24900 },
  imaging_video: { name: 'Imaging + Video Consult', amount: 44900 },
  diagnostic_single: { name: 'Single Study Read', amount: 7500 },
  diagnostic_second: { name: 'Diagnostic Second Opinion', amount: 25000 },
  ai_assistant: { name: 'AI Health Assistant', amount: 2900, interval: 'month' },
  digital_platform: { name: 'Digital Health Platform', amount: 1900, interval: 'month' },
  membership_elite: { name: 'All Access — Elite', amount: 19900, interval: 'month' },
  membership_plus: { name: 'All Access — Plus', amount: 14900, interval: 'month' },
  membership_core: { name: 'All Access — Core', amount: 9900, interval: 'month' },
  telehealth_premium: { name: 'Telehealth Premium', amount: 9900, interval: 'month' },
  telehealth_standard: { name: 'Telehealth Standard', amount: 5900, interval: 'month' },
  telehealth_basic: { name: 'Telehealth Basic', amount: 2900, interval: 'month' },
};

function buildCheckoutRedirectUrl(options: {
  baseUrl: string;
  targetUrl?: string | null;
  consultationId?: string | null;
  sessionId: string;
  paymentStatus: 'success' | 'cancelled';
}): string {
  const { baseUrl, targetUrl, consultationId, sessionId, paymentStatus } = options;
  const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, '');
  const normalizedTargetUrl = targetUrl?.trim();

  let redirectUrl: URL;
  try {
    redirectUrl = normalizedTargetUrl
      ? new URL(normalizedTargetUrl, normalizedBaseUrl)
      : new URL(normalizedBaseUrl);
  } catch {
    redirectUrl = new URL(normalizedBaseUrl);
  }

  redirectUrl.searchParams.set('payment', paymentStatus);

  if (paymentStatus === 'success') {
    redirectUrl.searchParams.set('session_id', sessionId);
    if (consultationId) {
      redirectUrl.searchParams.set('consultationId', consultationId);
    }
  } else {
    redirectUrl.searchParams.delete('session_id');
  }

  return redirectUrl.toString();
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    if (!auth) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const { serviceKey, consultationId, priceId, returnUrl, cancelUrl } = await req.json();
    const adminDb = db as admin.firestore.Firestore;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://patriotic-virtual-emr.web.app';

    // If Stripe is not configured, use mock flow
    if (!stripe) {
      console.warn('Stripe not configured — using mock checkout flow');

      if (consultationId && adminDb) {
        const consultRef = adminDb.collection('consultations').doc(consultationId);
        const mockSessionId = 'mock_session_' + Date.now();

        await consultRef.update({
          paymentStatus: 'paid',
          status: 'waitlist',
          stripeSessionId: mockSessionId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const consultSnap = await consultRef.get();
        const consultData = consultSnap.exists ? consultSnap.data()! : {};

        // Create appointment record in patient sub-collection
        if (uid) {
          await adminDb
            .collection('patients')
            .doc(uid)
            .collection('appointments')
            .add({
              providerName: 'Patriotic Provider',
              providerId: 'dr-o-admin-uid',
              type: 'Telehealth',
              status: 'pending_scheduling',
              scheduledAt: null,
              meetingUrl: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
              consultationId,
              serviceKey: consultData.serviceKey || 'general_visit',
              intakeAnswers: consultData.intake || {},
              reason: (consultData.serviceKey || 'Telehealth consultation'),
              patientUid: uid,
              date: admin.firestore.FieldValue.serverTimestamp(),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
      }

      const mockUrl = buildCheckoutRedirectUrl({
        baseUrl,
        targetUrl: returnUrl,
        consultationId,
        sessionId: `mock_session_${Date.now()}`,
        paymentStatus: 'success',
      });
      return NextResponse.json({ sessionId: 'mock_' + Date.now(), url: mockUrl });
    }

    // Real Stripe flow
    const item = CATALOG[serviceKey];
    if (!item) {
      return NextResponse.json({ error: `Invalid service: ${serviceKey}` }, { status: 400 });
    }

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: 1,
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: item.amount,
        ...(item.interval ? { recurring: { interval: item.interval as Stripe.Price.Recurring.Interval } } : {}),
      },
    };

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
        paymentStatus: 'cancelled',
        sessionId: '{CHECKOUT_SESSION_ID}',
      }),
      metadata: {
        serviceKey,
        consultationId: consultationId || '',
        uid,
      },
    };

    sessionConfig.billing_address_collection = 'required';

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
