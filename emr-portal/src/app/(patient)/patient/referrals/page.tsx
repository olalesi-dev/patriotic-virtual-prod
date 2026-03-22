import { buildPageMetadata } from '@/lib/metadata';
import ReferralsClient from './ReferralsClient';

export const metadata = buildPageMetadata(
    'Refer & Earn',
    'Invite friends to Patriotic Telehealth and earn rewards.',
    { noIndex: true }
);

export default function ReferralsPage() {
    return <ReferralsClient />;
}
