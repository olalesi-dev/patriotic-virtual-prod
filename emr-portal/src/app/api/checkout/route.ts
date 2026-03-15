import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
    try {
        const { service, price, patientName, date, time, appointmentId } = await req.json();

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: service,
                            description: `Appointment for ${patientName} on ${date} at ${time}`,
                        },
                        unit_amount: price * 100, // Price in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `https://patriotic-virtual-emr.web.app/book/success?session_id={CHECKOUT_SESSION_ID}&patientName=${encodeURIComponent(patientName)}&service=${encodeURIComponent(service)}&date=${date || 'TBD'}&time=${time || 'TBD'}&appointmentId=${appointmentId}`,
            cancel_url: `https://patriotic-virtual-emr.web.app/patient/appointments`,
            metadata: {
                patientName,
                service,
                date,
                time,
                type: 'video',
                appointmentId
            }
        });

        return NextResponse.json({ id: session.id });
    } catch (err: any) {
        console.error('Stripe Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
