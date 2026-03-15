import { buildPageMetadata } from '@/lib/metadata';
import CrmEntityDetailClient from './PageClient';

export function generateMetadata({ params }: { params: { entity: string, id: string } }) {
    const isNew = params.id === 'new';
    const title = params.entity.charAt(0).toUpperCase() + params.entity.slice(1);
    return buildPageMetadata(
        `${isNew ? 'New' : 'Edit'} ${title} - CRM`,
        `Manage details for this ${params.entity} record.`
    );
}

export default function CrmEntityDetailPage({ params }: { params: { entity: string, id: string } }) {
    return <CrmEntityDetailClient entityType={params.entity} id={params.id} />;
}
