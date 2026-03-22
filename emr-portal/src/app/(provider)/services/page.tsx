import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Services Catalog',
    'Review available services, offerings, and care programs.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
