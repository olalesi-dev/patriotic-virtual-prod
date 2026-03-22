import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Appointments',
    'Review patient appointments, visit history, and upcoming care.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
