import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'AI Action Queue',
    'Monitor AI-generated actions, pending reviews, and workflow items.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
