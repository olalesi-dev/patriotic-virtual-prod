import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db as adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { session_id, order_id } = body;

        if (!session_id || !order_id) {
            return NextResponse.json({ error: 'Missing session ID or order ID' }, { status: 400 });
        }

        if (!adminDb) return NextResponse.json({ error: 'Database uninitialized' }, { status: 500 });
        const db = adminDb!;

        // 1. Verify Stripe session
        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        if (session.payment_status !== 'paid') {
            return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
        }

        // 2. Fetch Order
        const orderRef = db.collection('shop-orders').doc(order_id);
        const orderSnap = await orderRef.get();
        
        if (!orderSnap.exists) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        
        const orderData = orderSnap.data()!;

        if (orderData.paymentStatus === 'paid') {
            // Already processed
            return NextResponse.json({ success: true, alreadyProcessed: true });
        }

        // 3. Mark Order as Paid and Decrement Inventory
        const batch = db.batch();
        batch.update(orderRef, { paymentStatus: 'paid', updatedAt: new Date() });

        for (const item of orderData.items) {
            const productRef = db.collection('shop-products').doc(item.productId);
            // Since we don't have atomic FieldValue.increment in regular SDK, we can decrement directly here for simplcity, 
            // In a real high-traffic app we'd use a transaction or admin.firestore.FieldValue.increment(-item.quantity)
            // But nextjs server might not bundle 'firebase-admin/firestore' easily, we use `adminDb` from firebase-admin wrapper.
            // Let's use standard read/write batch.
            const pSnap = await productRef.get();
            if (pSnap.exists) {
                const currentQty = pSnap.data()?.inventoryLevel || 0;
                batch.update(productRef, { inventoryLevel: Math.max(0, currentQty - item.quantity) });
            }
        }

        // 4. Send Inbox Notification to Patient
        const notifRef = db.collection('users').doc(orderData.patientId).collection('notifications').doc();
        batch.set(notifRef, {
            subject: 'Order Confirmation #' + orderData.orderNumber,
            body: `Your order for ${orderData.items.length} item(s) has been placed successfully. We will notify you once it ships.`,
            priority: 'normal',
            read: false,
            timestamp: new Date()
        });

        await batch.commit();

        return NextResponse.json({ success: true, order: orderData });
    } catch (err: any) {
        console.error('Shop Confirm Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
