import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'User Management',
    'Manage users, roles, access, and account status in the provider portal.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
