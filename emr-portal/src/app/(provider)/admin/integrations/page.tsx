import { IntegrationsClient } from './IntegrationsClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Integrations Hub',
    'Manage third-party connections and plugins.',
    { noIndex: true }
);

export default function IntegrationsPage() {
    return <IntegrationsClient />;
}
