import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Labs & Results',
    'Review laboratory results, panels, and related health metrics.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
