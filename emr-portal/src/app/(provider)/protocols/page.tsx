import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Protocols',
    'Access provider protocols and care pathway references.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
