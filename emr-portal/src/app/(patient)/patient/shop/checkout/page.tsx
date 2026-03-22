import { CheckoutClient } from './CheckoutClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Checkout | Shop',
    'Review your cart and proceed to secure checkout.',
);

export default function ShopCheckoutPage() {
    return <CheckoutClient />;
}
