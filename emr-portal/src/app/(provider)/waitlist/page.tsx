import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Patient Waitlist',
    'Review provider-scoped waitlist patients and scheduling priorities.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
