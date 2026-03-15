import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Contacts',
    'Review provider contacts and communication references.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
