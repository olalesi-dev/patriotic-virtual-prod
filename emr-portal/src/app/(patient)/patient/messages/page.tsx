import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Messages',
    'Review secure patient messages and communication history.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
