"use client";

import './globals.css';
import '@/lib/firebase'; // Initialize Firebase
import { MfaEnrollmentGate } from '@/components/auth/MfaEnrollmentGate';
import { Inter } from 'next/font/google';
import { MainLayout } from '@/components/layout/MainLayout';

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
                    <MainLayout>
                        {children}
                    </MainLayout>
                </MfaEnrollmentGate>
            </body>
        </html>
    );
}
