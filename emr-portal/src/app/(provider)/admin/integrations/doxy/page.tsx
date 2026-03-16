import { DoxyClient } from './DoxyClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Doxy.me Integration',
    'Telehealth video consultations and virtual waiting room settings.',
    { noIndex: true }
);

export default function DoxyPage() {
    return <DoxyClient />;
}
