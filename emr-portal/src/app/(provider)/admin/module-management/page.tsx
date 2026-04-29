import PageClient from './PageClient';
import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Module Management | Admin',
    'Manage access to modules based on user roles and configure persona groups.',
    { noIndex: true }
);

export default function ModuleManagementPage() {
    return <PageClient />;
}
