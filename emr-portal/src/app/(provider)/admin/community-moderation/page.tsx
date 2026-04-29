import { ModerationDashboardClient } from './ModerationDashboardClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Community Moderation | Admin',
    'AI-powered moderation dashboard for reviewing flagged content.',
    { noIndex: true }
);

export default function CommunityModerationPage() {
    return <ModerationDashboardClient />;
}
