import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Notifications',
    'Review provider notifications, alerts, and workflow updates.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
