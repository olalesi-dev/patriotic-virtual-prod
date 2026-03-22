import { CheckoutSuccessClient } from './CheckoutSuccessClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Order Confirmed | Shop',
    'Your order has been placed successfully.',
    { noIndex: true }
);

export default function ShopCheckoutSuccessPage() {
    return <CheckoutSuccessClient />;
}
