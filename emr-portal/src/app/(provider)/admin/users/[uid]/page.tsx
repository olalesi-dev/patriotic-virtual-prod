import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'User Details',
    'Review and manage account details for an individual user.',
    { noIndex: true }
);

export default function Page({ params }: { params: { uid: string } }) {
    return <PageClient params={params} />;
}
