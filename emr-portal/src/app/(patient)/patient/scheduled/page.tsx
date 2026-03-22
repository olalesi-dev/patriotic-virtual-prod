import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Scheduled Visits',
    'Review upcoming scheduled visits and care plan activity.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
