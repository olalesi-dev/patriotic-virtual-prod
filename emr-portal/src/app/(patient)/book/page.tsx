import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Book Appointment',
    'Book a new appointment through Patriotic Virtual Telehealth.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
