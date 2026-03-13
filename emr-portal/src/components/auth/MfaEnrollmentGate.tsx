"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { multiFactor } from 'firebase/auth';

const isPublicRoute = (pathname: string) =>
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/book');

export const MfaEnrollmentGate = ({ children }: { children: React.ReactNode }) => {
    const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (isPublicRoute(pathname)) {
            setLoading(false);
            return;
        }

        console.log('MfaEnrollmentGate: Checking auth state...');
        // Local dev bypass check
        const isMockAuth = localStorage.getItem('emr_mock_auth') === 'true';
        if (isMockAuth) {
            console.log('MfaEnrollmentGate: Mock auth detected');
            setUser({ email: 'demo@patriotic.com', displayName: 'Demo Clinician' });
            setIsEnrolled(true);
            setLoading(false);
            return;
        }

        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            console.log('MfaEnrollmentGate: Auth state changed. User:', currentUser ? currentUser.email : 'None');
            setUser(currentUser);
            if (currentUser) {
                const enrolledFactors = multiFactor(currentUser).enrolledFactors;
                console.log('MfaEnrollmentGate: Enrolled factors count:', enrolledFactors.length);
                setIsEnrolled(enrolledFactors.length > 0);
            } else {
                console.log('MfaEnrollmentGate: No user session found');
                setIsEnrolled(false);
                if (pathname !== '/login') {
                    console.log('MfaEnrollmentGate: Not on login page, redirecting...');
                    router.push('/login');
                }
            }
            console.log('MfaEnrollmentGate: Loading finished');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pathname, router]);

    if (isPublicRoute(pathname)) {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-brand rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Security Check</p>
                </div>
            </div>
        );
    }

    // If no user survived the onAuthStateChanged redirect, just show children (likely /login)
    // NOTE: MFA Enforcement disabled for now as requested.
    return <>{children}</>;
};

