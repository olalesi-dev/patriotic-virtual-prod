import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Sign In',
    'Secure sign in for providers and patients using Patriotic Virtual Telehealth.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
