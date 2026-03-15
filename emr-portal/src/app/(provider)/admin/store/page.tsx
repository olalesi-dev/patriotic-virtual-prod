import { StoreAdminClient } from './StoreAdminClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Store Management | Admin',
    'Manage shop products, orders, discounts, and analytics.',
    { noIndex: true }
);

export default function StoreAdminPage() {
    return <StoreAdminClient />;
}
