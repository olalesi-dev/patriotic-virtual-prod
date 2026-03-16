import { buildPageMetadata } from '@/lib/metadata';
import DocumentDetailClient from './DocumentDetailClient';

export const metadata = buildPageMetadata(
    'Document Detail',
    'View and manage compliance document details.'
);

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
    return <DocumentDetailClient documentId={params.id} />;
}
