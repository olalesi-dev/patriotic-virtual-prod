import { CommunityClient } from '@/components/community/CommunityClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Community | Provider Portal',
    'View and moderate the secure community feed.',
    { noIndex: true }
);

export default function ProviderCommunityPage() {
    return <CommunityClient role="provider" />;
}
