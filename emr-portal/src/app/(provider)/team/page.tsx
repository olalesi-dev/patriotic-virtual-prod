import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Team',
    'Manage care team membership, collaboration, and assigned patients.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
