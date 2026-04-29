import { APIKeysClient } from './APIKeysClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'API Keys',
    'Manage developer access credentials and webhooks.',
    { noIndex: true }
);

export default function APIKeysPage() {
    return <APIKeysClient />;
}
