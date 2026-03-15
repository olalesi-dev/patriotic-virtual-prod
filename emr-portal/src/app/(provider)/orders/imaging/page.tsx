import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Imaging Orders',
    'Review imaging orders, workflow status, and provider actions.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
