import { buildPageMetadata } from '@/lib/metadata';
import CrmDashboardClient from './CrmDashboardClient';

export const metadata = buildPageMetadata(
    'CRM Dashboard',
    'Manage your CRM pipeline including patients, facilities, vendors, and campaigns.'
);

export default function CrmDashboardPage() {
    return <CrmDashboardClient />;
}
