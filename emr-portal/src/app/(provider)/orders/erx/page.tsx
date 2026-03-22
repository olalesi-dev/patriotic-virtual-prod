import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'eRx / Prescriptions',
    'Manage prescriptions, refill workflows, and medication actions.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
