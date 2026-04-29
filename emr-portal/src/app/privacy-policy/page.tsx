import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Privacy Policy',
    'Review privacy practices, HIPAA handling, and communications policies for Patriotic Virtual Telehealth.',
    { noIndex: false }
);

export default function Page() {
    return <PageClient />;
}
