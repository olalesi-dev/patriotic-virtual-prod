import { createHash, randomBytes } from 'crypto';
import { DEFAULT_MARKETING_ORIGIN, normalizeAbsoluteUrl } from '../config/app-origins';
import { admin, firebaseAuth, firestore } from '../config/firebase';
import { notifyPriorityQueuePaymentSuccess } from '../modules/notifications/producers';
import {
    buildStripeLineItem,
    completeTelehealthConsultationPayment,
    CONSULTATION_CATALOG,
} from './consultation-payments';
import {
    HAIR_LOSS_SCREENING_VERSION,
    HAIR_LOSS_SERVICE_KEY,
    normalizeHairLossScreening,
} from './hair-loss-screening';
import {
    METABOLIC_HOLD_MESSAGE,
    METABOLIC_SERVICE_KEY,
    normalizeMetabolicScreening,
} from './metabolic-screening';
import { sendEmail } from './sendgrid';
import { logger } from '../utils/logger';

const INTAKE_CHECKOUTS_COLLECTION = 'intake_checkouts';
const SIGNUP_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const STRIPE_CHECKOUT_SESSION_TOKEN = '{CHECKOUT_SESSION_ID}';

type StripeClient = NonNullable<Parameters<typeof buildStripeLineItem>[1]> & {
    checkout: {
        sessions: {
            create: (params: Record<string, unknown>) => Promise<CheckoutSession>;
        };
    };
};

type CheckoutSession = Record<string, any> & {
    id: string;
    client_reference_id?: string | null;
    metadata?: Record<string, string> | null;
    payment_status?: string | null;
    customer_details?: { email?: string | null } | null;
    customer_email?: string | null;
    customer?: string | { id?: string } | null;
    payment_intent?: string | { id?: string } | null;
    subscription?: string | { id?: string } | null;
    amount_subtotal?: number | null;
    amount_total?: number | null;
    currency?: string | null;
    url?: string | null;
};

export type PaidSignupRegistration = {
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    password?: string;
    dob: string;
    sex: string;
    address1: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
};

type IntakeCheckoutRecord = FirebaseFirestore.DocumentData & {
    id?: string;
    serviceKey?: string;
    serviceName?: string;
    amount?: number;
    currency?: string;
    intake?: Record<string, unknown>;
    screening?: unknown;
    clinicalPayload?: Record<string, unknown>;
    status?: string;
    paymentStatus?: string;
    customerEmail?: string | null;
    stripeCheckoutSessionId?: string;
    stripeCustomerId?: string | null;
    stripePaymentIntentId?: string | null;
    stripeSubscriptionId?: string | null;
    signupTokenHash?: string | null;
    signupTokenExpiresAt?: unknown;
    signupTokenUsedAt?: unknown;
    userId?: string | null;
    consultationId?: string | null;
};

function hashSignupToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
}

function normalizeEmail(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeUsPhone(value: unknown): string {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return '';
}

function normalizeUsZip(value: unknown): string {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 5 ? digits.slice(0, 5) : '';
}

function isAdult(dateOfBirth: string): boolean {
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return false;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }

    return age >= 18;
}

function asPlainObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function pruneUndefined<T extends Record<string, unknown>>(value: T): T {
    Object.keys(value).forEach((key) => {
        if (value[key] === undefined) {
            delete value[key];
        }
    });
    return value;
}

function restoreStripeSessionToken(url: string): string {
    return url.replace(
        encodeURIComponent(STRIPE_CHECKOUT_SESSION_TOKEN),
        STRIPE_CHECKOUT_SESSION_TOKEN,
    );
}

function buildPaidSignupRedirectUrl(options: {
    baseUrl: string;
    targetUrl?: string | null;
    intakeCheckoutId: string;
    sessionId: string;
    paymentStatus: 'success' | 'cancelled';
}): string {
    const normalizedBaseUrl = options.baseUrl;
    const baseUrl = new URL(normalizedBaseUrl);
    let redirectUrl: URL;

    try {
        redirectUrl = new URL(options.targetUrl || normalizedBaseUrl, normalizedBaseUrl);
    } catch {
        redirectUrl = baseUrl;
    }

    if (redirectUrl.origin !== baseUrl.origin) {
        redirectUrl = baseUrl;
    }

    redirectUrl.searchParams.set('payment', options.paymentStatus === 'success' ? 'paid_signup' : 'cancelled');
    redirectUrl.searchParams.set('intakeCheckoutId', options.intakeCheckoutId);

    if (options.paymentStatus === 'success') {
        redirectUrl.searchParams.set('session_id', options.sessionId);
    } else {
        redirectUrl.searchParams.delete('session_id');
    }

    return restoreStripeSessionToken(redirectUrl.toString());
}

function getStripeId(value: string | { id?: string } | null | undefined): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return typeof value.id === 'string' ? value.id : null;
}

function getCheckoutSessionEmail(session: CheckoutSession): string {
    return normalizeEmail(session.customer_details?.email || session.customer_email || '');
}

function getMarketingOrigin(): string {
    return normalizeAbsoluteUrl(process.env.MARKETING_URL) ?? DEFAULT_MARKETING_ORIGIN;
}

async function recordPaidSignupAudit(action: string, details: Record<string, unknown>) {
    try {
        await firestore.collection('audit_logs').add(pruneUndefined({
            action,
            source: 'stripe_first_paid_signup',
            entityType: 'intake_checkout',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ...details,
        }));
    } catch (error) {
        logger.warn('Paid signup audit write failed', { action, error });
    }
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function sendPaidSignupSetupEmail(input: {
    email: string;
    sessionId: string;
    intakeCheckoutId: string;
    serviceName: string;
}) {
    if (!process.env.SENDGRID_API_KEY?.trim()) {
        throw new Error('SENDGRID_API_KEY is not configured.');
    }

    const setupUrl = new URL(getMarketingOrigin());
    setupUrl.searchParams.set('payment', 'paid_signup');
    setupUrl.searchParams.set('session_id', input.sessionId);
    setupUrl.searchParams.set('intakeCheckoutId', input.intakeCheckoutId);

    const serviceCopy = input.serviceName || 'your selected service';
    const text = [
        'Your payment was successful.',
        '',
        `Complete your Patriotic Telehealth account setup for ${serviceCopy}:`,
        setupUrl.toString(),
        '',
        'If you already completed setup, you can ignore this email.',
    ].join('\n');
    const safeUrl = escapeHtml(setupUrl.toString());
    const html = `
        <p>Your payment was successful.</p>
        <p>Complete your Patriotic Telehealth account setup for ${escapeHtml(serviceCopy)}.</p>
        <p><a href="${safeUrl}">Complete account setup</a></p>
        <p>If you already completed setup, you can ignore this email.</p>
    `;

    await sendEmail(input.email, 'Complete your Patriotic Telehealth account setup', text, html);
}

function unixSecondsToDate(value: unknown): Date | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return new Date(value * 1000);
}

function buildClinicalPayload(serviceKey: string, screening: unknown): Record<string, unknown> {
    const catalogItem = CONSULTATION_CATALOG[serviceKey];

    if (serviceKey === HAIR_LOSS_SERVICE_KEY) {
        const normalizedScreening = normalizeHairLossScreening(screening);
        return {
            serviceCategory: catalogItem?.serviceCategory ?? 'consultation',
            serviceLine: catalogItem?.serviceLine ?? HAIR_LOSS_SERVICE_KEY,
            service_line: catalogItem?.serviceLine ?? HAIR_LOSS_SERVICE_KEY,
            clinicalType: catalogItem?.clinicalType ?? 'async_or_sync',
            chartCategory: catalogItem?.chartCategory ?? 'dermatology',
            chart_category: catalogItem?.chartCategory ?? 'dermatology',
            requiresIntake: catalogItem?.requiresIntake ?? true,
            requiresIdVerification: catalogItem?.requiresIdVerification ?? true,
            requiresRxCapableProvider: catalogItem?.requiresRxCapableProvider ?? true,
            screeningVersion: normalizedScreening.screeningVersion,
            screening_version: normalizedScreening.screeningVersion,
            screening: normalizedScreening.screening,
            screeningResponses: normalizedScreening.screeningResponses,
            screeningFlags: normalizedScreening.screeningFlags,
            requiresClinicianReview: normalizedScreening.requiresClinicianReview,
            stripeProductId: catalogItem?.stripeProductId ?? null,
            sku: catalogItem?.sku ?? null,
        };
    }

    if (serviceKey === METABOLIC_SERVICE_KEY) {
        const normalizedScreening = normalizeMetabolicScreening(screening);
        if (!normalizedScreening.paymentEligible) {
            const error = new Error(METABOLIC_HOLD_MESSAGE);
            (error as Error & { statusCode?: number }).statusCode = 400;
            throw error;
        }

        return {
            serviceCategory: catalogItem?.serviceCategory ?? 'program',
            serviceLine: catalogItem?.serviceLine ?? METABOLIC_SERVICE_KEY,
            service_line: catalogItem?.serviceLine ?? METABOLIC_SERVICE_KEY,
            clinicalType: catalogItem?.clinicalType ?? 'async_or_sync',
            chartCategory: catalogItem?.chartCategory ?? 'metabolic',
            chart_category: catalogItem?.chartCategory ?? 'metabolic',
            requiresIntake: catalogItem?.requiresIntake ?? true,
            requiresIdVerification: catalogItem?.requiresIdVerification ?? true,
            requiresRxCapableProvider: catalogItem?.requiresRxCapableProvider ?? false,
            screeningVersion: normalizedScreening.screeningVersion,
            screening_version: normalizedScreening.screeningVersion,
            screening: normalizedScreening.screening,
            screeningResponses: normalizedScreening.screeningResponses,
            screeningFlags: normalizedScreening.screeningFlags,
            requiresClinicianReview: normalizedScreening.requiresClinicianReview,
            paymentEligible: normalizedScreening.paymentEligible,
            stripeProductId: catalogItem?.stripeProductId ?? null,
            sku: catalogItem?.sku ?? null,
        };
    }

    return {};
}

function buildRegistration(rawRegistration: unknown, emailOverride?: string): PaidSignupRegistration {
    const source = asPlainObject(rawRegistration);
    const firstName = normalizeString(source.firstName);
    const lastName = normalizeString(source.lastName);
    const email = normalizeEmail(emailOverride || source.email);
    const password = typeof source.password === 'string' ? source.password : undefined;
    const dob = normalizeString(source.dob || source.dateOfBirth);
    const sex = normalizeString(source.sex || source.sexAtBirth);
    const address1 = normalizeString(source.address1 || source.address);
    const city = normalizeString(source.city);
    const state = normalizeString(source.state).toUpperCase();
    const zipCode = normalizeUsZip(source.zipCode || source.zip || source.postalCode);
    const phone = normalizeUsPhone(source.phone || source.phoneNumber);

    if (!firstName || !lastName) {
        throw new Error('First name and last name are required.');
    }
    if (!email) {
        throw new Error('Email is required.');
    }
    if (!dob || !isAdult(dob)) {
        throw new Error('You must be at least 18 years old to create an account.');
    }
    if (!sex) {
        throw new Error('Sex is required.');
    }
    if (!address1 || !city || !state) {
        throw new Error('Address, city, and state are required.');
    }
    if (state !== 'FL') {
        throw new Error("We're currently only available in Florida.");
    }
    if (!zipCode) {
        throw new Error('ZIP code must be a valid 5-digit US ZIP.');
    }
    if (!phone) {
        throw new Error('Phone number must be a valid 10-digit US phone number.');
    }

    return {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        email,
        password,
        dob,
        sex,
        address1,
        city,
        state,
        zipCode,
        phone,
    };
}

function getTimestampDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return null;
}

async function getAccountAttachmentEligibility(uid: string): Promise<{
    allowed: boolean;
    role: string;
    patientDocExists: boolean;
}> {
    const [userDoc, patientDoc] = await Promise.all([
        firestore.collection('users').doc(uid).get(),
        firestore.collection('patients').doc(uid).get(),
    ]);
    const role = normalizeString(userDoc.exists ? userDoc.data()?.role : '').toLowerCase();
    const patientDocExists = patientDoc.exists;
    const allowed = !role || role === 'patient' || patientDocExists;

    return {
        allowed,
        role,
        patientDocExists,
    };
}

async function assertEmailIsAvailable(email: string): Promise<void> {
    try {
        await firebaseAuth.getUserByEmail(email);
        const error = new Error('An account with that email already exists. Please log in to complete this paid intake.');
        (error as Error & { statusCode?: number; code?: string }).statusCode = 409;
        (error as Error & { statusCode?: number; code?: string }).code = 'ACCOUNT_EXISTS';
        throw error;
    } catch (error) {
        if ((error as { code?: string }).code === 'auth/user-not-found') return;
        throw error;
    }
}

export async function createPaidIntakeCheckout(args: {
    stripeClient: StripeClient;
    serviceKey: string;
    intake?: unknown;
    screening?: unknown;
    returnUrl?: string | null;
    cancelUrl?: string | null;
    baseUrl: string;
}) {
    const serviceKey = normalizeString(args.serviceKey);
    const catalogItem = CONSULTATION_CATALOG[serviceKey];
    if (!serviceKey || !catalogItem) {
        const error = new Error(serviceKey ? `Invalid service: ${serviceKey}` : 'Service is required.');
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
    }

    const intake = asPlainObject(args.intake);
    const clinicalPayload = buildClinicalPayload(serviceKey, args.screening);
    const intakeCheckoutRef = firestore.collection(INTAKE_CHECKOUTS_COLLECTION).doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await intakeCheckoutRef.set({
        id: intakeCheckoutRef.id,
        flow: 'stripe_first_paid_signup',
        serviceKey,
        serviceName: catalogItem.name,
        amount: catalogItem.amount,
        currency: 'usd',
        intake,
        screening: args.screening ?? null,
        clinicalPayload,
        status: 'checkout_created',
        paymentStatus: 'unpaid',
        createdAt: now,
        updatedAt: now,
    });

    const lineItem = await buildStripeLineItem(serviceKey, args.stripeClient);
    const sessionConfig: Record<string, unknown> = {
        mode: catalogItem.interval ? 'subscription' : 'payment',
        allow_promotion_codes: true,
        line_items: [lineItem],
        client_reference_id: intakeCheckoutRef.id,
        success_url: buildPaidSignupRedirectUrl({
            baseUrl: args.baseUrl,
            targetUrl: args.returnUrl,
            intakeCheckoutId: intakeCheckoutRef.id,
            sessionId: STRIPE_CHECKOUT_SESSION_TOKEN,
            paymentStatus: 'success',
        }),
        cancel_url: buildPaidSignupRedirectUrl({
            baseUrl: args.baseUrl,
            targetUrl: args.cancelUrl,
            intakeCheckoutId: intakeCheckoutRef.id,
            sessionId: STRIPE_CHECKOUT_SESSION_TOKEN,
            paymentStatus: 'cancelled',
        }),
        metadata: {
            flow: 'stripe_first_paid_signup',
            intakeCheckoutId: intakeCheckoutRef.id,
            serviceKey,
        },
        billing_address_collection: 'required',
        phone_number_collection: { enabled: true },
        custom_text: {
            submit: {
                message: 'Refunds are available only if your consultation has not been completed by a clinician.',
            },
        },
    };

    if (!catalogItem.interval) {
        sessionConfig.payment_intent_data = pruneUndefined({
            statement_descriptor: catalogItem.statementDescriptor,
            metadata: {
                flow: 'stripe_first_paid_signup',
                intakeCheckoutId: intakeCheckoutRef.id,
                serviceKey,
            },
        });
        sessionConfig.customer_creation = 'always';
    }

    if (serviceKey === METABOLIC_SERVICE_KEY) {
        sessionConfig.custom_fields = [
            {
                key: 'florida_resident',
                label: {
                    type: 'custom',
                    custom: 'Florida Resident?',
                },
                type: 'dropdown',
                dropdown: {
                    options: [
                        { label: 'Yes', value: 'yes' },
                        { label: 'No', value: 'no' },
                    ],
                },
                optional: false,
            },
        ];
    }

    const session = await args.stripeClient.checkout.sessions.create(sessionConfig);
    await intakeCheckoutRef.set({
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: getStripeId(session.customer),
        status: 'payment_pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
        intakeCheckoutId: intakeCheckoutRef.id,
        sessionId: session.id,
        checkoutUrl: session.url,
    };
}

export async function findPaidIntakeCheckoutBySessionId(sessionId: string) {
    const normalizedSessionId = normalizeString(sessionId);
    if (!normalizedSessionId) return null;

    const snap = await firestore
        .collection(INTAKE_CHECKOUTS_COLLECTION)
        .where('stripeCheckoutSessionId', '==', normalizedSessionId)
        .limit(1)
        .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return {
        ref: doc.ref,
        data: doc.data() as IntakeCheckoutRecord,
    };
}

export async function findPaidIntakeCheckoutBySessionOrId(sessionId?: string | null, intakeCheckoutId?: string | null) {
    const normalizedIntakeCheckoutId = normalizeString(intakeCheckoutId);
    if (normalizedIntakeCheckoutId) {
        const ref = firestore.collection(INTAKE_CHECKOUTS_COLLECTION).doc(normalizedIntakeCheckoutId);
        const snap = await ref.get();
        if (snap.exists) {
            const data = snap.data() as IntakeCheckoutRecord;
            if (!sessionId || data.stripeCheckoutSessionId === sessionId) {
                return { ref, data };
            }
        }
    }

    return findPaidIntakeCheckoutBySessionId(sessionId || '');
}

export async function markPaidIntakeCheckoutFromStripeSession(session: CheckoutSession) {
    const intakeCheckoutId = normalizeString(session.metadata?.intakeCheckoutId || session.client_reference_id);
    if (!intakeCheckoutId) return false;

    const ref = firestore.collection(INTAKE_CHECKOUTS_COLLECTION).doc(intakeCheckoutId);
    const snap = await ref.get();
    if (!snap.exists) return false;

    const existingData = snap.data() as IntakeCheckoutRecord;
    if (existingData.status === 'account_created') {
        await ref.set(pruneUndefined({
            stripeCheckoutSessionId: session.id,
            stripeCustomerId: getStripeId(session.customer),
            stripePaymentIntentId: getStripeId(session.payment_intent),
            stripeSubscriptionId: getStripeId(session.subscription),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }), { merge: true });
        return true;
    }

    const customerEmail = getCheckoutSessionEmail(session);
    const paymentStatus = session.payment_status;
    const nextStatus = paymentStatus === 'paid'
        ? 'signup_pending'
        : paymentStatus === 'no_payment_required'
            ? 'manual_review'
            : 'payment_pending';

    await ref.set(pruneUndefined({
        status: nextStatus,
        paymentStatus,
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: getStripeId(session.customer),
        stripePaymentIntentId: getStripeId(session.payment_intent),
        stripeSubscriptionId: getStripeId(session.subscription),
        customerEmail: customerEmail || null,
        amountSubtotal: session.amount_subtotal ?? null,
        amountTotal: session.amount_total ?? null,
        currency: session.currency ?? 'usd',
        paidAt: paymentStatus === 'paid' ? admin.firestore.FieldValue.serverTimestamp() : undefined,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }), { merge: true });

    await recordPaidSignupAudit(
        paymentStatus === 'paid'
            ? 'PAID_SIGNUP_PAYMENT_CONFIRMED'
            : paymentStatus === 'no_payment_required'
                ? 'PAID_SIGNUP_PAYMENT_MANUAL_REVIEW'
                : 'PAID_SIGNUP_PAYMENT_PENDING',
        pruneUndefined({
            intakeCheckoutId,
            serviceKey: normalizeString(existingData.serviceKey),
            stripeCheckoutSessionId: session.id,
            stripeCustomerId: getStripeId(session.customer),
            stripePaymentIntentId: getStripeId(session.payment_intent),
            stripeSubscriptionId: getStripeId(session.subscription),
            status: nextStatus,
            paymentStatus,
        }),
    );

    if (paymentStatus === 'paid' && customerEmail) {
        try {
            if (!existingData.accountSetupEmailSentAt) {
                await sendPaidSignupSetupEmail({
                    email: customerEmail,
                    sessionId: session.id,
                    intakeCheckoutId,
                    serviceName: normalizeString(existingData.serviceName),
                });
                await ref.set({
                    accountSetupEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
        } catch (error) {
            await ref.set({
                accountSetupEmailError: error instanceof Error ? error.message : String(error),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
    }

    return true;
}

export async function markPaidIntakeCheckoutFailedFromStripeSession(session: CheckoutSession, status: 'failed' | 'expired') {
    const intakeCheckoutId = normalizeString(session.metadata?.intakeCheckoutId || session.client_reference_id);
    if (!intakeCheckoutId) return false;

    const ref = firestore.collection(INTAKE_CHECKOUTS_COLLECTION).doc(intakeCheckoutId);
    const snap = await ref.get();
    if (!snap.exists) return false;

    const existingStatus = normalizeString((snap.data() as IntakeCheckoutRecord).status);
    if (['signup_pending', 'account_created'].includes(existingStatus)) {
        return true;
    }

    await ref.set({
        status,
        paymentStatus: status,
        stripeCheckoutSessionId: session.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await recordPaidSignupAudit(
        status === 'expired' ? 'PAID_SIGNUP_CHECKOUT_EXPIRED' : 'PAID_SIGNUP_PAYMENT_FAILED',
        {
            intakeCheckoutId,
            stripeCheckoutSessionId: session.id,
            status,
            paymentStatus: status,
        },
    );

    return true;
}

export async function markPaidIntakeCheckoutBillingEventByPaymentIntent(args: {
    paymentIntentId?: string | null;
    billingStatus: 'refunded' | 'disputed';
    amountRefunded?: number | null;
    disputeId?: string | null;
}) {
    const paymentIntentId = normalizeString(args.paymentIntentId);
    if (!paymentIntentId) return false;

    const snap = await firestore
        .collection(INTAKE_CHECKOUTS_COLLECTION)
        .where('stripePaymentIntentId', '==', paymentIntentId)
        .limit(1)
        .get();

    if (snap.empty) return false;

    const doc = snap.docs[0];
    const data = doc.data() as IntakeCheckoutRecord;
    const isAccountCreated = data.status === 'account_created';
    const status = isAccountCreated
        ? data.status
        : args.billingStatus === 'disputed'
            ? 'manual_review'
            : 'refunded';

    await doc.ref.set(pruneUndefined({
        status,
        billingStatus: args.billingStatus,
        paymentStatus: args.billingStatus,
        amountRefunded: args.amountRefunded ?? undefined,
        stripeDisputeId: args.disputeId ?? undefined,
        refundedAt: args.billingStatus === 'refunded' ? admin.firestore.FieldValue.serverTimestamp() : undefined,
        disputedAt: args.billingStatus === 'disputed' ? admin.firestore.FieldValue.serverTimestamp() : undefined,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }), { merge: true });

    await recordPaidSignupAudit(
        args.billingStatus === 'refunded'
            ? 'PAID_SIGNUP_PAYMENT_REFUNDED'
            : 'PAID_SIGNUP_PAYMENT_DISPUTED',
        pruneUndefined({
            intakeCheckoutId: data.id || doc.id,
            serviceKey: normalizeString(data.serviceKey),
            consultationId: data.consultationId || null,
            userId: data.userId || null,
            stripePaymentIntentId: paymentIntentId,
            stripeDisputeId: args.disputeId ?? undefined,
            billingStatus: args.billingStatus,
        }),
    );

    if (data.consultationId) {
        await firestore.collection('consultations').doc(data.consultationId).set(pruneUndefined({
            billingStatus: args.billingStatus,
            paymentStatus: args.billingStatus,
            amountRefunded: args.amountRefunded ?? undefined,
            stripeDisputeId: args.disputeId ?? undefined,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }), { merge: true });
    }

    return true;
}

export async function markPaidIntakeCheckoutSubscriptionEvent(args: {
    subscriptionId?: string | null;
    billingStatus: string;
    subscriptionStatus?: string | null;
    invoiceId?: string | null;
    cancelAtPeriodEnd?: boolean | null;
    currentPeriodEnd?: number | null;
}) {
    const subscriptionId = normalizeString(args.subscriptionId);
    if (!subscriptionId) return false;

    const snap = await firestore
        .collection(INTAKE_CHECKOUTS_COLLECTION)
        .where('stripeSubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();

    if (snap.empty) return false;

    const doc = snap.docs[0];
    const data = doc.data() as IntakeCheckoutRecord;
    const isAccountCreated = data.status === 'account_created';
    const shouldReview = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(args.billingStatus);
    const nextStatus = isAccountCreated
        ? data.status
        : args.billingStatus === 'canceled'
            ? 'payment_canceled'
            : shouldReview
                ? 'manual_review'
                : data.status;

    const subscriptionPatch = pruneUndefined({
        status: nextStatus,
        billingStatus: args.billingStatus,
        paymentStatus: args.billingStatus,
        subscriptionStatus: args.subscriptionStatus ?? args.billingStatus,
        stripeSubscriptionId: subscriptionId,
        stripeLatestInvoiceId: normalizeString(args.invoiceId),
        subscriptionCancelAtPeriodEnd: args.cancelAtPeriodEnd ?? undefined,
        subscriptionCurrentPeriodEnd: unixSecondsToDate(args.currentPeriodEnd),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await doc.ref.set(subscriptionPatch, { merge: true });

    await recordPaidSignupAudit('PAID_SIGNUP_SUBSCRIPTION_SYNCED', pruneUndefined({
        intakeCheckoutId: data.id || doc.id,
        serviceKey: normalizeString(data.serviceKey),
        consultationId: data.consultationId || null,
        userId: data.userId || null,
        stripeSubscriptionId: subscriptionId,
        stripeLatestInvoiceId: normalizeString(args.invoiceId),
        billingStatus: args.billingStatus,
        subscriptionStatus: args.subscriptionStatus ?? args.billingStatus,
    }));

    if (data.consultationId) {
        await firestore.collection('consultations').doc(data.consultationId).set(pruneUndefined({
            billingStatus: args.billingStatus,
            paymentStatus: args.billingStatus,
            subscriptionStatus: args.subscriptionStatus ?? args.billingStatus,
            stripeLatestInvoiceId: normalizeString(args.invoiceId),
            subscriptionCancelAtPeriodEnd: args.cancelAtPeriodEnd ?? undefined,
            subscriptionCurrentPeriodEnd: unixSecondsToDate(args.currentPeriodEnd),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }), { merge: true });
    }

    return true;
}

export async function createPaidSignupToken(sessionId: string, intakeCheckoutId?: string | null) {
    const checkout = await findPaidIntakeCheckoutBySessionOrId(sessionId, intakeCheckoutId);
    if (!checkout) {
        const error = new Error('Paid intake checkout was not found.');
        (error as Error & { statusCode?: number }).statusCode = 404;
        throw error;
    }

    const data = checkout.data;
    const status = normalizeString(data.status);
    const customerEmail = normalizeEmail(data.customerEmail);
    const responseBase = {
        intakeCheckoutId: data.id || checkout.ref.id,
        status,
        paymentStatus: normalizeString(data.paymentStatus),
        serviceKey: normalizeString(data.serviceKey),
        serviceName: normalizeString(data.serviceName),
        email: customerEmail,
        signupAllowed: false,
        loginRequired: false,
        message: '',
    };

    if (status === 'account_created') {
        return {
            ...responseBase,
            signupAllowed: false,
            loginRequired: false,
            consultationId: data.consultationId || null,
            message: 'This paid intake has already been attached to an account.',
        };
    }

    if (status !== 'signup_pending') {
        return {
            ...responseBase,
            message: status === 'manual_review'
                ? 'Your payment requires manual review before signup can continue.'
                : status === 'failed' || status === 'expired'
                    ? 'Payment was not completed. Please try checkout again.'
                    : 'Your payment is being confirmed. Please wait.',
        };
    }

    if (customerEmail) {
        try {
            const existingUser = await firebaseAuth.getUserByEmail(customerEmail);
            const eligibility = await getAccountAttachmentEligibility(existingUser.uid);
            if (!eligibility.allowed) {
                await checkout.ref.set({
                    status: 'manual_review',
                    accountConflictUid: existingUser.uid,
                    accountConflictRole: eligibility.role || 'unknown',
                    accountConflictReason: 'paid_signup_email_belongs_to_non_patient_account',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                await recordPaidSignupAudit('PAID_SIGNUP_ACCOUNT_CONFLICT', {
                    intakeCheckoutId: data.id || checkout.ref.id,
                    serviceKey: normalizeString(data.serviceKey),
                    stripeCheckoutSessionId: normalizeString(data.stripeCheckoutSessionId),
                    accountConflictUid: existingUser.uid,
                    accountConflictRole: eligibility.role || 'unknown',
                    status: 'manual_review',
                });

                return {
                    ...responseBase,
                    status: 'manual_review',
                    signupAllowed: false,
                    loginRequired: false,
                    message: 'This payment email is already tied to a non-patient account. Please contact support or use a different patient email.',
                };
            }

            return {
                ...responseBase,
                loginRequired: true,
                message: 'Payment is confirmed. Log in with this email to attach the paid intake to your account.',
            };
        } catch (error) {
            if ((error as { code?: string }).code !== 'auth/user-not-found') {
                throw error;
            }
        }
    }

    const signupToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SIGNUP_TOKEN_TTL_MS);
    await checkout.ref.set({
        signupTokenHash: hashSignupToken(signupToken),
        signupTokenExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await recordPaidSignupAudit('PAID_SIGNUP_TOKEN_GENERATED', {
        intakeCheckoutId: data.id || checkout.ref.id,
        serviceKey: normalizeString(data.serviceKey),
        stripeCheckoutSessionId: normalizeString(data.stripeCheckoutSessionId),
        status,
    });

    return {
        ...responseBase,
        signupAllowed: true,
        signupToken,
        signupTokenExpiresAt: expiresAt.toISOString(),
        message: 'Payment is confirmed. Create your account to continue identity verification.',
    };
}

async function persistPaidPatientProfile(uid: string, registration: PaidSignupRegistration, options: {
    authProvider: string;
    stripeCustomerId?: string | null;
}) {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const patientRecord = {
        uid,
        email: registration.email,
        name: registration.displayName,
        displayName: registration.displayName,
        firstName: registration.firstName,
        lastName: registration.lastName,
        dob: registration.dob,
        dateOfBirth: registration.dob,
        sex: registration.sex,
        sexAtBirth: registration.sex,
        gender: registration.sex,
        address: registration.address1,
        address1: registration.address1,
        city: registration.city,
        state: registration.state,
        zip: registration.zipCode,
        zipCode: registration.zipCode,
        phone: registration.phone,
        phoneNumber: registration.phone,
        role: 'patient',
        status: 'active',
        signupSource: 'stripe_first_paid_signup',
        authProvider: options.authProvider,
        stripeCustomerId: options.stripeCustomerId || null,
        isIdentityVerified: false,
        identityVerification: {
            provider: 'vouched',
            status: 'not_started',
            verified: false,
            jobId: null,
            internalId: null,
            verifiedAt: null,
            lastUpdatedAt: timestamp,
            failureReason: null,
            warningCode: null,
            warningMessage: null,
        },
        updatedAt: timestamp,
    };

    await Promise.all([
        firestore.collection('patients').doc(uid).set({
            ...patientRecord,
            createdAt: timestamp,
        }, { merge: true }),
        firestore.collection('users').doc(uid).set(patientRecord, { merge: true }),
    ]);
}

async function createConsultationForPaidSignup(args: {
    checkoutRef: FirebaseFirestore.DocumentReference;
    checkout: IntakeCheckoutRecord;
    uid: string;
    registration: PaidSignupRegistration;
}) {
    if (args.checkout.consultationId) {
        return args.checkout.consultationId;
    }

    const serviceKey = normalizeString(args.checkout.serviceKey);
    const catalogItem = CONSULTATION_CATALOG[serviceKey];
    if (!serviceKey || !catalogItem) {
        throw new Error('Paid intake references an invalid service.');
    }

    const intake = {
        ...asPlainObject(args.checkout.intake),
        firstName: args.registration.firstName,
        lastName: args.registration.lastName,
        email: args.registration.email,
        dateOfBirth: args.registration.dob,
        dob: args.registration.dob,
        sex: args.registration.sex,
        state: args.registration.state,
        phone: args.registration.phone,
        address1: args.registration.address1,
        address: args.registration.address1,
        city: args.registration.city,
        zipCode: args.registration.zipCode,
        zip: args.registration.zipCode,
    };
    const clinicalPayload = asPlainObject(args.checkout.clinicalPayload);
    const consultationId = `paid_${args.checkoutRef.id}`;
    const consultationRef = firestore.collection('consultations').doc(consultationId);

    await consultationRef.set({
        uid: args.uid,
        patient: args.registration.displayName,
        patientEmail: args.registration.email,
        serviceKey,
        intake,
        stripeProductId: clinicalPayload.stripeProductId || catalogItem.stripeProductId || null,
        status: 'pending',
        paymentStatus: 'paid',
        stripeSessionId: args.checkout.stripeCheckoutSessionId || null,
        stripeCustomerId: args.checkout.stripeCustomerId || null,
        stripePaymentIntentId: args.checkout.stripePaymentIntentId || null,
        stripeSubscriptionId: args.checkout.stripeSubscriptionId || null,
        sourceIntakeCheckoutId: args.checkout.id || args.checkoutRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...clinicalPayload,
    });

    const consultationData = await completeTelehealthConsultationPayment({
        consultationId,
        uid: args.uid,
        stripeSessionId: normalizeString(args.checkout.stripeCheckoutSessionId),
    });

    try {
        await notifyPriorityQueuePaymentSuccess({
            appointmentId: consultationId,
            patientId: args.uid,
            patientName: typeof consultationData.patient === 'string'
                ? consultationData.patient
                : args.registration.displayName || 'Patient',
            serviceName: typeof consultationData.serviceKey === 'string'
                ? consultationData.serviceKey
                : serviceKey || 'Consultation',
            requestedAt: new Date(),
            appointmentReason: typeof consultationData.reason === 'string'
                ? consultationData.reason
                : typeof consultationData.serviceKey === 'string'
                    ? consultationData.serviceKey
                    : 'Consultation request',
        });
        await args.checkoutRef.set({
            priorityQueueNotificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
            priorityQueueNotificationError: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        logger.error('Paid signup priority queue notification failed', { consultationId, uid: args.uid, error });
        await args.checkoutRef.set({
            priorityQueueNotificationError: error instanceof Error ? error.message : String(error),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    await args.checkoutRef.set({
        status: 'account_created',
        userId: args.uid,
        consultationId,
        signupTokenUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await recordPaidSignupAudit('PAID_SIGNUP_ACCOUNT_ATTACHED', pruneUndefined({
        intakeCheckoutId: args.checkout.id || args.checkoutRef.id,
        serviceKey,
        userId: args.uid,
        consultationId,
        stripeCheckoutSessionId: normalizeString(args.checkout.stripeCheckoutSessionId),
        stripeCustomerId: normalizeString(args.checkout.stripeCustomerId),
        stripePaymentIntentId: normalizeString(args.checkout.stripePaymentIntentId),
        stripeSubscriptionId: normalizeString(args.checkout.stripeSubscriptionId),
        status: 'account_created',
    }));

    return consultationId;
}

function assertPaidSignupState(checkout: IntakeCheckoutRecord) {
    if (checkout.status === 'account_created') return;
    if (checkout.status !== 'signup_pending') {
        const error = new Error('Payment is not confirmed for signup yet.');
        (error as Error & { statusCode?: number }).statusCode = 409;
        throw error;
    }
}

function assertSignupToken(checkout: IntakeCheckoutRecord, signupToken: string) {
    const tokenHash = normalizeString(checkout.signupTokenHash);
    const expiresAt = getTimestampDate(checkout.signupTokenExpiresAt);
    const usedAt = getTimestampDate(checkout.signupTokenUsedAt);

    if (!tokenHash || hashSignupToken(signupToken) !== tokenHash || usedAt || !expiresAt || expiresAt.getTime() < Date.now()) {
        const error = new Error('Signup link is invalid or expired. Please reload the payment success page.');
        (error as Error & { statusCode?: number }).statusCode = 403;
        throw error;
    }
}

export async function completePaidSignup(args: {
    sessionId: string;
    intakeCheckoutId?: string | null;
    signupToken?: string | null;
    registration?: unknown;
    authenticatedUid?: string | null;
}) {
    const checkout = await findPaidIntakeCheckoutBySessionOrId(args.sessionId, args.intakeCheckoutId);
    if (!checkout) {
        const error = new Error('Paid intake checkout was not found.');
        (error as Error & { statusCode?: number }).statusCode = 404;
        throw error;
    }

    const data = checkout.data;
    assertPaidSignupState(data);

    if (data.status === 'account_created' && data.userId && data.consultationId) {
        if (args.authenticatedUid && args.authenticatedUid !== data.userId) {
            const error = new Error('This paid intake is already attached to another account.');
            (error as Error & { statusCode?: number }).statusCode = 403;
            throw error;
        }

        return {
            userId: data.userId,
            consultationId: data.consultationId,
            serviceKey: normalizeString(data.serviceKey),
            serviceName: normalizeString(data.serviceName),
            stripeSessionId: normalizeString(data.stripeCheckoutSessionId),
            alreadyCompleted: true,
        };
    }

    const checkoutEmail = normalizeEmail(data.customerEmail);

    if (args.authenticatedUid) {
        const authUser = await firebaseAuth.getUser(args.authenticatedUid);
        const eligibility = await getAccountAttachmentEligibility(authUser.uid);
        if (!eligibility.allowed) {
            const error = new Error('This paid intake cannot be attached to a non-patient account. Please contact support.');
            (error as Error & { statusCode?: number }).statusCode = 403;
            throw error;
        }

        const authEmail = normalizeEmail(authUser.email);
        if (checkoutEmail && authEmail && checkoutEmail !== authEmail) {
            const error = new Error('Please log in with the same email used at Stripe checkout.');
            (error as Error & { statusCode?: number }).statusCode = 403;
            throw error;
        }
        if (!checkoutEmail) {
            assertSignupToken(data, normalizeString(args.signupToken));
        }

        const registration = buildRegistration(args.registration, authEmail || checkoutEmail);
        await persistPaidPatientProfile(authUser.uid, registration, {
            authProvider: authUser.providerData[0]?.providerId || 'firebase',
            stripeCustomerId: normalizeString(data.stripeCustomerId),
        });

        const consultationId = await createConsultationForPaidSignup({
            checkoutRef: checkout.ref,
            checkout: data,
            uid: authUser.uid,
            registration,
        });

        return {
            userId: authUser.uid,
            consultationId,
            serviceKey: normalizeString(data.serviceKey),
            serviceName: normalizeString(data.serviceName),
            stripeSessionId: normalizeString(data.stripeCheckoutSessionId),
            alreadyCompleted: false,
        };
    }

    const signupToken = normalizeString(args.signupToken);
    if (!signupToken) {
        const error = new Error('Signup token is required.');
        (error as Error & { statusCode?: number }).statusCode = 403;
        throw error;
    }

    assertSignupToken(data, signupToken);
    const registration = buildRegistration(args.registration, checkoutEmail || undefined);
    if (!registration.password || registration.password.length < 8) {
        const error = new Error('Password must be at least 8 characters.');
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
    }

    if (checkoutEmail && registration.email !== checkoutEmail) {
        const error = new Error('Signup email must match the email used at Stripe checkout.');
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
    }

    await assertEmailIsAvailable(registration.email);
    const authUser = await firebaseAuth.createUser({
        email: registration.email,
        password: registration.password,
        displayName: registration.displayName,
        disabled: false,
        emailVerified: false,
    });

    await persistPaidPatientProfile(authUser.uid, registration, {
        authProvider: 'password',
        stripeCustomerId: normalizeString(data.stripeCustomerId),
    });

    const consultationId = await createConsultationForPaidSignup({
        checkoutRef: checkout.ref,
        checkout: data,
        uid: authUser.uid,
        registration,
    });
    const customToken = await firebaseAuth.createCustomToken(authUser.uid, { role: 'patient' });

    return {
        userId: authUser.uid,
        consultationId,
        customToken,
        serviceKey: normalizeString(data.serviceKey),
        serviceName: normalizeString(data.serviceName),
        stripeSessionId: normalizeString(data.stripeCheckoutSessionId),
        alreadyCompleted: false,
    };
}

export function getPaidSignupStatusCode(error: unknown): number {
    const statusCode = (error as { statusCode?: number }).statusCode;
    return typeof statusCode === 'number' ? statusCode : 500;
}

export function getPaidSignupErrorCode(error: unknown): string | null {
    const code = (error as { code?: string }).code;
    return typeof code === 'string' ? code : null;
}
