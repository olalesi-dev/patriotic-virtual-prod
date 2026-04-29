import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Medications',
    'Review current medications, prescriptions, and treatment details.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
