import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Telehealth',
    'Launch and manage secure telehealth sessions and visit workflows.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
