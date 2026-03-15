import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Clinical Dashboard',
    'Review clinical analytics, outcomes, and operational performance.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
