import { PluginsClient } from './PluginsClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Plugins & Extensions',
    'Manage third-party community modules.',
    { noIndex: true }
);

export default function PluginsPage() {
    return <PluginsClient />;
}
