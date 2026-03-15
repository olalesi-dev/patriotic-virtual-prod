import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Booking Success',
    'Confirm that your appointment booking request was completed successfully.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
