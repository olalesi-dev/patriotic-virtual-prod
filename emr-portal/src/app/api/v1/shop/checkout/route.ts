import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db as adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { items, patientId, patientName, originUrl } = body;

        if (!items || !items.length || !patientId) {
            return NextResponse.json({ error: 'Missing required cart details' }, { status: 400 });
        }

        if (!adminDb) {
            return NextResponse.json({ error: 'Database uninitialized' }, { status: 500 });
        }

        const db = adminDb!;

        // 1. Calculate amounts and verify inventory
        let total = 0;
        const line_items: any[] = [];
        const orderItems: any[] = [];

        for (const item of items) {
            const productSnap = await db.collection('shop-products').doc(item.product.id).get();
            if (!productSnap.exists) {
                return NextResponse.json({ error: `Product not found: ${item.product.name}` }, { status: 404 });
            }
            
            const productData = productSnap.data()!;
            if (productData.inventoryLevel < item.quantity) {
                return NextResponse.json({ error: `Insufficient stock for ${item.product.name}` }, { status: 400 });
            }

            const price = parseFloat(productData.price) || item.product.price;
            total += price * item.quantity;

            line_items.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: productData.name,
                        images: productData.images?.length ? [productData.images[0]] : [],
                    },
                    unit_amount: Math.round(price * 100),
                },
                quantity: item.quantity,
            });

            orderItems.push({
                productId: item.product.id,
                name: productData.name,
                sku: productData.sku || '',
                price: price,
                quantity: item.quantity,
                image: productData.images?.[0] || null
            });
        }

        // 2. Generate a unique order number (simple format)
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

        // 3. Create a pending order in Firestore
        const orderRef = db.collection('shop-orders').doc();
        await orderRef.set({
            orderNumber,
            patientId,
            patientName: patientName || 'Patient',
            items: orderItems,
            subtotal: total,
            total: total,
            paymentStatus: 'pending',
            fulfillmentStatus: 'Pending',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const baseUrl = originUrl || 'https://patriotic-virtual-emr.web.app';

        // 4. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US'],
            },
            line_items,
            client_reference_id: orderRef.id,
            mode: 'payment',
            success_url: `${baseUrl}/patient/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderRef.id}`,
            cancel_url: `${baseUrl}/patient/shop/checkout`,
            metadata: {
                orderId: orderRef.id,
                patientId
            }
        });

        return NextResponse.json({ id: session.id, url: session.url });
    } catch (err: any) {
        console.error('Shop Checkout Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
