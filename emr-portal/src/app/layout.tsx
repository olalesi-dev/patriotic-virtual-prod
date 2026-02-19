"use client";

import './globals.css';
import '@/lib/firebase'; // Initialize Firebase
import { MfaEnrollmentGate } from '@/components/auth/MfaEnrollmentGate';
import { Inter } from 'next/font/google';
import { MainLayout } from '@/components/layout/MainLayout';
import { SecurityShell } from '@/components/auth/SecurityShell';

const inter = Inter({ subsets: ['latin'] });

// Patient component wrapper for metadata separation if needed, but for now simple layout
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-slate-50 text-navy antialiased min-h-screen`}>
                <MfaEnrollmentGate>
                    <SecurityShell>
                        <MainLayout>
                            {children}
                        </MainLayout>
                    </SecurityShell>
                </MfaEnrollmentGate>
            </body>
        </html>
    );
}
