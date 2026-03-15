import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Lab Orders',
    'Manage lab orders, statuses, and provider workflow actions.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
