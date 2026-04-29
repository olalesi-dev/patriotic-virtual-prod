"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { multiFactor } from 'firebase/auth';

const isPublicRoute = (pathname: string) =>
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/privacy-policy' ||
    pathname === '/terms' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/book');

export const MfaEnrollmentGate = ({ children }: { children: React.ReactNode }) => {
    const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const redirectTimeoutRef = useRef<number | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (redirectTimeoutRef.current !== null) {
            window.clearTimeout(redirectTimeoutRef.current);
            redirectTimeoutRef.current = null;
        }

        if (isPublicRoute(pathname)) {
            setLoading(false);
            return;
        }

        console.log('MfaEnrollmentGate: Checking auth state...');
        // Local dev bypass check
        const isLocalDevHost = typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
        );
        const isMockAuth = isLocalDevHost && localStorage.getItem('emr_mock_auth') === 'true';
        if (!isLocalDevHost && localStorage.getItem('emr_mock_auth') === 'true') {
            localStorage.removeItem('emr_mock_auth');
        }
        if (isMockAuth) {
            console.log('MfaEnrollmentGate: Mock auth detected');
            setUser({ email: 'demo@patriotic.com', displayName: 'Demo Clinician' });
            setIsEnrolled(true);
            setLoading(false);
            return;
        }

        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            console.log('MfaEnrollmentGate: Auth state changed. User:', currentUser ? currentUser.email : 'None');

            if (redirectTimeoutRef.current !== null) {
                window.clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }

            setUser(currentUser);
            if (currentUser) {
                const enrolledFactors = multiFactor(currentUser).enrolledFactors;
                console.log('MfaEnrollmentGate: Enrolled factors count:', enrolledFactors.length);
                setIsEnrolled(enrolledFactors.length > 0);
                setLoading(false);
            } else {
                console.log('MfaEnrollmentGate: No user session found');
                redirectTimeoutRef.current = window.setTimeout(() => {
                    const stabilizedUser = auth.currentUser;
                    if (stabilizedUser) {
                        console.log('MfaEnrollmentGate: User session stabilized after transient null state');
                        setUser(stabilizedUser);
                        const enrolledFactors = multiFactor(stabilizedUser).enrolledFactors;
                        setIsEnrolled(enrolledFactors.length > 0);
                        setLoading(false);
                        return;
                    }

                    setIsEnrolled(false);
                    if (pathname !== '/login') {
                        console.log('MfaEnrollmentGate: Not on login page after auth recheck, redirecting...');
                        router.replace('/login');
                    }
                    setLoading(false);
                }, 600);
                return;
            }
            console.log('MfaEnrollmentGate: Loading finished');
        });

        return () => {
            unsubscribe();
            if (redirectTimeoutRef.current !== null) {
                window.clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }
        };
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
