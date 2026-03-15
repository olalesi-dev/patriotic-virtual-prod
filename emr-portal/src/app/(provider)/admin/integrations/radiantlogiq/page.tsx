import { RadiantLogiqClient } from './RadiantLogiqClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'RadiantLogiq Integration',
    'Enterprise data exchange and API synchronization settings.',
    { noIndex: true }
);

export default function RadiantLogiqPage() {
    return <RadiantLogiqClient />;
}
