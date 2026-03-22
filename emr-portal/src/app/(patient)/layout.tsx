import type { Metadata } from 'next';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { ErrorBoundary, SecurityWrapper } from '@/components/layout/SecurityWrapper';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'Patient Portal',
    'Secure patient portal for appointments, messages, records, and account settings.',
    { noIndex: true }
);

export default function PatientAppLayout({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary>
            <SecurityWrapper>
                <PatientLayout>
                    {children}
                </PatientLayout>
            </SecurityWrapper>
        </ErrorBoundary>
    );
}
