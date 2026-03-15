import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'PACS',
    'Access imaging studies and PACS workflow information.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
