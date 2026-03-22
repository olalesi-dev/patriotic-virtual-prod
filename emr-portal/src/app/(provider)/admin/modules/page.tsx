import { ModulesClient } from '@/components/admin/ModulesClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Specialty Modules | Admin',
    'Manage and configure specialty clinical and CRM modules for your practice.',
    { noIndex: true }
);

export default function ModulesPage() {
    return <ModulesClient />;
}
