import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Patient Dashboard',
    'Review appointments, messages, records, and patient portal activity.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
