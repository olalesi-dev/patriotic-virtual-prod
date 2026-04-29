import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Settings',
    'Manage patient account settings, preferences, and personal configuration.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
