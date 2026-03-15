import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Billing',
    'Review provider billing workflows, charges, and financial activity.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
