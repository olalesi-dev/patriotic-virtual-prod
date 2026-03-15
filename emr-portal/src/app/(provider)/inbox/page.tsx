import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Inbox / Messages',
    'Review provider conversations, patient messages, and communication workflows.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
