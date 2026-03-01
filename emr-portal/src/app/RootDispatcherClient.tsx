"use client";

import { doc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { auth, db } from '@/lib/firebase';

const normalizeRole = (value: unknown): 'patient' | 'provider' | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'patient') return 'patient';
    if (!normalized) return null;
    return 'provider';
};

export default function RootDispatcher() {
    const redirectTo = (destination: string) => {
        if (typeof window === 'undefined') return;
        if (window.location.pathname === destination) return;
        window.location.replace(destination);
    };

    useEffect(() => {
        let isActive = true;

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!isActive) return;

            if (user) {
                try {
                    const [userDoc, patientDoc] = await Promise.all([
                        getDoc(doc(db, 'users', user.uid)),
                        getDoc(doc(db, 'patients', user.uid))
                    ]);

                    const userRole = normalizeRole(userDoc.exists() ? userDoc.data()?.role : null);
                    const patientRole = normalizeRole(patientDoc.exists() ? patientDoc.data()?.role : null);
                    const effectiveRole = userRole ?? patientRole ?? (patientDoc.exists() ? 'patient' : 'provider');

                    redirectTo(effectiveRole === 'patient' ? '/patient' : '/dashboard');
                } catch (error) {
                    console.error('Dispatch error:', error);
                    redirectTo('/dashboard');
                }
            } else {
                redirectTo('/login');
            }
        });

        return () => {
            isActive = false;
            unsubscribe();
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Verifying Session...</p>
            </div>
        </div>
    );
}
