"use client";

import './globals.css';
import '@/lib/firebase'; // Initialize Firebase
import { MfaEnrollmentGate } from '@/components/auth/MfaEnrollmentGate';
import { Inter } from 'next/font/google';
import { SecurityShell } from '@/components/auth/SecurityShell';
import { MainLayout } from '@/components/layout/MainLayout';
import { initializeTrustedTypes } from '@/lib/trusted-types';
import { useEffect } from 'react';
import { Toaster as SonnerToaster } from 'sonner';

// Initialize Trusted Types immediately
if (typeof window !== 'undefined') {
    console.log('🚀 RootLayout module evaluated. Initializing Trusted Types...');
    initializeTrustedTypes();
}

import AINavigator from '@/components/AINavigator';

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
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                const legacyWorkerNames = ['/sw.js', '/service-worker.js', '/workbox-sw.js'];
                for (const registration of registrations) {
                    const scriptUrl = registration.active?.scriptURL
                        ?? registration.waiting?.scriptURL
                        ?? registration.installing?.scriptURL;
                    if (!scriptUrl) continue;

                    const shouldUnregister = legacyWorkerNames.some((legacyWorkerName) => scriptUrl.endsWith(legacyWorkerName));
                    if (!shouldUnregister) continue;

                    registration.unregister();
                    console.log('Unregistered legacy service worker:', scriptUrl);
                }
            });
        }
    }, []);

    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
            </head>
            <body className={`${inter.className} bg-slate-50 dark:bg-slate-900/50 text-navy antialiased min-h-screen`}>
                <MfaEnrollmentGate>
                    <SecurityShell>
                        <SonnerToaster position="top-right" richColors closeButton />
                        <AINavigator />
                        {children}
                    </SecurityShell>
                </MfaEnrollmentGate>
            </body>
        </html>
    );
}
