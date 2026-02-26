"use client";

import { PatientLayout } from '@/components/layout/PatientLayout';
import { ErrorBoundary, SecurityWrapper } from '@/components/layout/SecurityWrapper';

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
