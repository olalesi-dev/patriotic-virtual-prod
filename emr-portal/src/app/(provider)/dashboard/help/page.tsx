import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Dashboard Help',
    'Access provider dashboard support resources and help content.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
