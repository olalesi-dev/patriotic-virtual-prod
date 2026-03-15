import { CommunicationsAdminClient } from './CommunicationsAdminClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Communications | Admin',
    'Manage sitewide banners and broadcast user notifications.',
    { noIndex: true }
);

export default function CommunicationsAdminPage() {
    return <CommunicationsAdminClient />;
}
