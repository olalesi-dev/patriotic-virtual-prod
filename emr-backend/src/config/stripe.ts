import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || '';

export const isStripeConfigured = stripeSecretKey.length > 0;
export const stripe = isStripeConfigured
    ? new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' as never })
    : null;
