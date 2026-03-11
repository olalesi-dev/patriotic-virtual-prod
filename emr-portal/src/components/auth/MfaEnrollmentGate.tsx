"use client";

import type { User as FirebaseUser } from 'firebase/auth';
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
    const [state, dispatch] = useReducer(gateReducer, initialGateState);
    const pathname = usePathname();
    const isPublicRoute = PUBLIC_ROUTES.has(pathname);

    useEffect(() => {
        if (isPublicRoute(pathname)) {
            setLoading(false);
            return;
        }

        console.log('MfaEnrollmentGate: Checking auth state...');
        // Local dev bypass check
        const isMockAuth = localStorage.getItem('emr_mock_auth') === 'true';
        if (isMockAuth) {
            dispatch({ type: 'hydrate_mock' });
            return;
        }

        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            dispatch({ type: 'sync_auth', user: currentUser });
        });

        return () => unsubscribe();
    }, [pathname, router]);

    if (isPublicRoute(pathname)) {
        return <>{children}</>;
    }

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

    // If no user survived the onAuthStateChanged redirect, just show children (likely /login)
    // NOTE: MFA Enforcement disabled for now as requested.
    return <>{children}</>;
};
