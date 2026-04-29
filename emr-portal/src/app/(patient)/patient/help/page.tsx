import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Help Center',
    'Access patient help resources, support guidance, and account assistance.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
