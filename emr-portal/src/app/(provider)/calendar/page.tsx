import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Calendar',
    'Review provider appointments, scheduling, and calendar availability.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
