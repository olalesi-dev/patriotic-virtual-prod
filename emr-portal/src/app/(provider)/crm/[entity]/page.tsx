import { buildPageMetadata } from '@/lib/metadata';
import CrmEntityClient from './PageClient';

export function generateMetadata({ params }: { params: { entity: string } }) {
    const title = params.entity.charAt(0).toUpperCase() + params.entity.slice(1);
    return buildPageMetadata(`${title} - CRM`, `Manage your CRM ${params.entity}.`);
}

export default function CrmEntityPage({ params }: { params: { entity: string } }) {
    return <CrmEntityClient entityType={params.entity} />;
}
