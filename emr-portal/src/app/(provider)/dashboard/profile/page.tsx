import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Provider Profile',
    'Manage provider profile details and personal account information.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
