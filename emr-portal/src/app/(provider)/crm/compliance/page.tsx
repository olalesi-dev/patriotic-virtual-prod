import { buildPageMetadata } from '@/lib/metadata';
import ComplianceClient from './ComplianceClient';

export const metadata = buildPageMetadata(
    'Compliance Documents',
    'Manage compliance documents and policies.'
);

export default function CompliancePage() {
    return <ComplianceClient />;
}
