import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Create Account',
    'Create a new Patriotic Virtual Telehealth account and begin onboarding.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
