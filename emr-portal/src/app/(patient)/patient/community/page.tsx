import { CommunityClient } from '@/components/community/CommunityClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Community | Patient Portal',
    'Connect with others on similar health journeys in a secure, anonymous environment.',
    { noIndex: true }
);

export default function PatientCommunityPage() {
    return <CommunityClient role="patient" />;
}
