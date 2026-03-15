import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Doxy Integration Settings',
    'Manage Doxy.me integration parameters and defaults for telehealth.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
