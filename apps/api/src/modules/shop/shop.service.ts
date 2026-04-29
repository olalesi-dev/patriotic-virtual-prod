import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { stripe, isStripeConfigured } from '../payments/stripe';
import { env } from '@workspace/env';
import { DEFAULT_APP_URL } from '@workspace/common';

export class ShopService {
  async createCheckoutSession(args: {
    userId: string;
    items: { productId: string; quantity: number }[];
    origin?: string;
  }) {
    if (!stripe || !isStripeConfigured) {
      throw new Error('Stripe is not configured');
    }

    const { userId, items, origin } = args;

    const [patient] = await db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.userId, userId))
      .limit(1);

    if (!patient) throw new Error('Patient profile not found');

    let subtotal = 0;
    const lineItems: any[] = [];
    const orderItems: any[] = [];

    for (const item of items) {
      const [product] = await db
        .select()
        .from(schema.shopProducts)
        .where(eq(schema.shopProducts.id, item.productId))
        .limit(1);

      if (!product) throw new Error(`Product not found: ${item.productId}`);
      if (product.inventoryLevel < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      subtotal += product.price * item.quantity;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            images: product.images || [],
          },
          unit_amount: product.price,
        },
        quantity: item.quantity,
      });

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(
      1000 + Math.random() * 9000,
    )}`;

    const baseUrl = origin || env.CORS_ORIGIN || DEFAULT_APP_URL;

    return await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(schema.shopOrders)
        .values({
          organizationId: patient.organizationId,
          patientId: patient.id,
          orderNumber,
          total: subtotal,
          paymentStatus: 'pending',
          fulfillmentStatus: 'Pending',
          updatedAt: new Date(),
        })
        .returning();

      for (const oi of orderItems) {
        await tx.insert(schema.shopOrderItems).values({
          orderId: order.id,
          ...oi,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        shipping_address_collection: {
          allowed_countries: ['US'],
        },
        line_items: lineItems,
        client_reference_id: order.id,
        mode: 'payment',
        success_url: `${baseUrl}/patient/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
        cancel_url: `${baseUrl}/patient/shop/checkout`,
        metadata: {
          orderId: order.id,
          patientId: patient.id,
          userId,
        },
      });

      await tx
        .update(schema.shopOrders)
        .set({ stripeSessionId: session.id })
        .where(eq(schema.shopOrders.id, order.id));

      return { sessionId: session.id, url: session.url };
    });
  }

  async confirmOrder(sessionId: string) {
    if (!stripe || !isStripeConfigured) throw new Error('Stripe is not configured');

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      throw new Error('Payment not confirmed');
    }

    const orderId = session.metadata?.orderId;
    if (!orderId) throw new Error('Order context missing from session');

    await db
      .update(schema.shopOrders)
      .set({
        paymentStatus: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(schema.shopOrders.id, orderId));

    return { success: true };
  }
}
