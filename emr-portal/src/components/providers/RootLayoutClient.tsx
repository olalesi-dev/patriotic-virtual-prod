"use client";

import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { useEffect } from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { MfaEnrollmentGate } from '@/components/auth/MfaEnrollmentGate';
import { SecurityShell } from '@/components/auth/SecurityShell';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { initializeTrustedTypes } from '@/lib/trusted-types';
import AINavigator from '@/components/AINavigator';

if (typeof window !== 'undefined') {
    console.log('🚀 RootLayout module evaluated. Initializing Trusted Types...');
    initializeTrustedTypes();
}

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            signInWithCustomToken(auth, token)
                .then(() => {
                    console.log('Cross-domain SSO successful');
                    const cleanUrl = new URL(window.location.href);
                    cleanUrl.searchParams.delete('token');
                    window.history.replaceState({}, '', cleanUrl.toString());
                })
                .catch(err => console.error('SSO Token Error:', err));
        }

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
        <QueryProvider>
            <MfaEnrollmentGate>
                <SecurityShell>
                    <SonnerToaster position="top-right" richColors closeButton />
                    <AINavigator />
                    {children}
                </SecurityShell>
            </MfaEnrollmentGate>
        </QueryProvider>
    );
}
