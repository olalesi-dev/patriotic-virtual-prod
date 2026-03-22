import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Billing',
    'Review patient billing activity, balances, and payment status.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
