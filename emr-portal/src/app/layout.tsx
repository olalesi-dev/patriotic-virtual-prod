"use client";

import './globals.css';
import '@/lib/firebase'; // Initialize Firebase
import { MfaEnrollmentGate } from '@/components/auth/MfaEnrollmentGate';
import { Inter } from 'next/font/google';
import { SecurityShell } from '@/components/auth/SecurityShell';
import { MainLayout } from '@/components/layout/MainLayout';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

// Patient component wrapper for metadata separation if needed, but for now simple layout
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Purge old service workers from the static version
    // Force new build hash: v2.1.0-DYNAMIC-FIX
    useEffect(() => {
        // Clear old caches aggressively
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    registration.unregister();
                    console.log('Unregistered stale service worker');
                }
            });
        }
        // Force reload if we find specific old keys
        if (localStorage.getItem('user_role') === null) {
            // Optional: force a refresh if the user seems stuck on old version
        }
    }, []);

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
