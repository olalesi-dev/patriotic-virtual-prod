import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || '';

export const isStripeConfigured = stripeSecretKey.length > 0;
export const stripe = isStripeConfigured
    ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as never })
    : null;
