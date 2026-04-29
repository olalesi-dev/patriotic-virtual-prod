import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Dashboard',
    'Review provider dashboard activity, appointments, waitlist, and patient messaging.',
    { noIndex: true }
);

export default function ProviderDashboardPage() {
    return <DashboardClient />;
}
