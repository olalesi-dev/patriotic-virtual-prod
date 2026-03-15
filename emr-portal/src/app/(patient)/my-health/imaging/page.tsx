import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Imaging',
    'Review imaging studies and related patient health information.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
