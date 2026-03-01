"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { multiFactor } from 'firebase/auth';
import { usePathname } from 'next/navigation';
import { useEffect, useReducer } from 'react';
import { auth } from '@/lib/firebase';
import { MfaSetup } from './MfaSetup';

const PUBLIC_ROUTES = new Set(['/login', '/signup', '/forgot-password', '/terms', '/privacy']);

type GateUser = FirebaseUser | { email: string; displayName: string };

interface GateState {
    isEnrolled: boolean | null;
    loading: boolean;
    user: GateUser | null;
}

type GateAction =
    | { type: 'hydrate_mock' }
    | { type: 'sync_auth'; user: FirebaseUser | null }
    | { type: 'set_enrolled'; value: boolean };

const initialGateState: GateState = {
    isEnrolled: null,
    loading: true,
    user: null
};

function gateReducer(state: GateState, action: GateAction): GateState {
    if (action.type === 'hydrate_mock') {
        return {
            isEnrolled: true,
            loading: false,
            user: { email: 'demo@patriotic.com', displayName: 'Demo Clinician' }
        };
    }

    if (action.type === 'sync_auth') {
        if (action.user) {
            const enrolledFactors = multiFactor(action.user).enrolledFactors;
            return {
                ...state,
                user: action.user,
                isEnrolled: enrolledFactors.length > 0,
                loading: false
            };
        }

        return {
            ...state,
            user: null,
            isEnrolled: false,
            loading: false
        };
    }

    return {
        ...state,
        isEnrolled: action.value
    };
}

export const MfaEnrollmentGate = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(gateReducer, initialGateState);
    const pathname = usePathname();
    const isPublicRoute = PUBLIC_ROUTES.has(pathname);

    useEffect(() => {
        const isMockAuth = localStorage.getItem('emr_mock_auth') === 'true';
        if (isMockAuth) {
            dispatch({ type: 'hydrate_mock' });
            return;
        }

        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            dispatch({ type: 'sync_auth', user: currentUser });
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (state.loading || typeof window === 'undefined') return;

        if (isPublicRoute && state.user && pathname !== '/') {
            window.location.replace('/');
            return;
        }

        if (!isPublicRoute && !state.user && pathname !== '/login') {
            window.location.replace('/login');
        }
    }, [isPublicRoute, pathname, state.loading, state.user]);

    if (state.loading) {
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
        if (state.user) {
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

    if (!state.user || state.isEnrolled) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
            <MfaSetup onComplete={() => dispatch({ type: 'set_enrolled', value: true })} />
        </div>
    );
};
