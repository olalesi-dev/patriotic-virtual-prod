"use client";

import './globals.css';
import '@/lib/firebase'; // Initialize Firebase
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { MfaEnrollmentGate } from '@/components/auth/MfaEnrollmentGate';
import { SecurityShell } from '@/components/auth/SecurityShell';
import { MainLayout } from '@/components/layout/MainLayout';
import { initializeTrustedTypes } from '@/lib/trusted-types';

// Initialize Trusted Types immediately
if (typeof window !== 'undefined') {
    console.log('🚀 RootLayout module evaluated. Initializing Trusted Types...');
    initializeTrustedTypes();
}

import { Toaster } from 'react-hot-toast';

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
            <body className={`${inter.className} bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased min-h-screen`}>
                <MfaEnrollmentGate>
                    <SecurityShell>
                        <SonnerToaster position="top-right" richColors closeButton />
                        <Toaster position="top-right" />
                        {children}
                    </SecurityShell>
                </MfaEnrollmentGate>
            </body>
        </html>
    );
}
