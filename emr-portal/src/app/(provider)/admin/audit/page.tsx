import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Audit Log',
    'Review provider portal audit activity and administrative events.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
