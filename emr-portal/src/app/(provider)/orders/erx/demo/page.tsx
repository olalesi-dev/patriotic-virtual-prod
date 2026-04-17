import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'DoseSpot Demo Runner',
    'Validate non-EPCS DoseSpot screen-demo dependencies and queue integrations.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
