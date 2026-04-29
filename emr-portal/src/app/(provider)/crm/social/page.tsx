import { buildPageMetadata } from '@/lib/metadata';
import SocialMediaClient from './SocialMediaClient';

export const metadata = buildPageMetadata(
    'Social Media Hub',
    'Manage your community connections and social post activity.',
    { noIndex: true }
);

export default function SocialMediaPage() {
    return <SocialMediaClient />;
}
