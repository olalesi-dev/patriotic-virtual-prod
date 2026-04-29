import type { Metadata } from 'next';
import { MainLayout } from '@/components/layout/MainLayout';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Provider Portal',
    'Secure provider workspace for dashboard, clinical operations, messaging, and patient management.',
    { noIndex: true }
);

export default function ProviderAppLayout({ children }: { children: React.ReactNode }) {
    return (
        <MainLayout>
            {children}
        </MainLayout>
    );
}
