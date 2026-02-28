"use client";

import { multiFactor } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { MfaSetup } from './MfaSetup';

const PUBLIC_ROUTES = new Set(['/login', '/signup', '/forgot-password', '/terms', '/privacy']);

export const MfaEnrollmentGate = ({ children }: { children: React.ReactNode }) => {
    const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const pathname = usePathname();
    const router = useRouter();
    const isPublicRoute = PUBLIC_ROUTES.has(pathname);

    useEffect(() => {
        // Local dev bypass check
        const isMockAuth = localStorage.getItem('emr_mock_auth') === 'true';
        if (isMockAuth) {
            setUser({ email: 'demo@patriotic.com', displayName: 'Demo Clinician' });
            setIsEnrolled(true);
            setLoading(false);
            return;
        }

        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const enrolledFactors = multiFactor(currentUser).enrolledFactors;
                setIsEnrolled(enrolledFactors.length > 0);
                if (isPublicRoute) {
                    router.replace('/');
                }
            } else {
                setIsEnrolled(false);
                if (!isPublicRoute) {
                    router.replace('/login');
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isPublicRoute, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                        {isPublicRoute ? 'Verifying Session...' : 'Security Check'}
                    </p>
                </div>
            </div>
        );
    }

    if (isPublicRoute) {
        if (user) {
            return (
                <div className="flex h-screen items-center justify-center bg-slate-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Verifying Session...</p>
                    </div>
                </div>
            );
        }
        return <>{children}</>;
    }

    if (!user || isEnrolled) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
            <MfaSetup onComplete={() => setIsEnrolled(true)} />
        </div>
    );
};
