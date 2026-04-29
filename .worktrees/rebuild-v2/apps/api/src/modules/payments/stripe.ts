import Stripe from 'stripe';
import { env } from '@workspace/env/index';

export const isStripeConfigured = !!env.STRIPE_SECRET_KEY;

export const stripe = isStripeConfigured
  ? new Stripe(env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' as any })
  : null;
