import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Settings',
    'Manage provider portal settings, preferences, and account configuration.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
