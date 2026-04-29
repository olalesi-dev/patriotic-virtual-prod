import type { Metadata } from 'next';
import PageClient from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Forgot Password',
    'Reset your Patriotic Virtual Telehealth account password and regain secure access.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
