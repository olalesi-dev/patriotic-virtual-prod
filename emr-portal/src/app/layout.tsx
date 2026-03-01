"use client";

import './globals.css';
import '@/lib/firebase'; // Initialize Firebase
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { MfaEnrollmentGate } from '@/components/auth/MfaEnrollmentGate';
import { SecurityShell } from '@/components/auth/SecurityShell';
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
    // Cleanup only legacy cache-busting workers while preserving FCM worker.
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                const legacyWorkerNames = ['/sw.js', '/service-worker.js', '/workbox-sw.js'];
                for (const registration of registrations) {
                    const scriptUrl = registration.active?.scriptURL ?? registration.waiting?.scriptURL ?? registration.installing?.scriptURL;
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
