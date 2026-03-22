import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Business Dashboard',
    'Review business performance, revenue, and operational analytics.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
