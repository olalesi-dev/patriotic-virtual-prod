"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Use initialized auth instance

interface UserProfile {
    role: string;
    mfa_enrolled_at: string | null;
}

export const MfaEnrollmentGate = ({ children }: { children: React.ReactNode }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        console.log('MfaEnrollmentGate: Effect running');
        const checkMfaStatus = async () => {
            const user = auth.currentUser;
            console.log('MfaEnrollmentGate: Current User:', user ? user.uid : 'null');

            if (!user) {
                console.log('MfaEnrollmentGate: No user found, stopping loading');
                setLoading(false);
                return;
            }

            try {
                console.log('MfaEnrollmentGate: Getting ID token...');
                const token = await user.getIdToken();
                console.log('MfaEnrollmentGate: Token acquired');
                // In production, fetch from actual backend
                // For now, assume un-enrolled provider for demo
                // const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                // const data = await res.json();

                // MOCK PROFILE FOR DEMO (Simulating a Provider who hasn't enrolled)
                // In real app, remove this mock and use fetch
                const isEnrolled = localStorage.getItem('mfa_completed') === 'true';
                const mockProfile = { role: 'Provider', mfa_enrolled_at: isEnrolled ? new Date().toISOString() : null };
                setProfile(mockProfile);
                console.log('MfaEnrollmentGate: Profile set');

            } catch (error) {
                console.error('Failed to check MFA status', error);
            } finally {
                console.log('MfaEnrollmentGate: Finally block, stopping loading');
                setLoading(false);
            }
        };

        // Use onAuthStateChanged to ensure we catch the initial load correctly
        const unsubscribe = auth.onAuthStateChanged((user) => {
            console.log('MfaEnrollmentGate: Auth State Changed:', user ? user.uid : 'null');
            // If we have a user, check MFA. If not, stop loading.
            if (user) {
                checkMfaStatus();
            } else {
                setLoading(false);
            }
        });

        // Safety timeout to prevent infinite loading state
        const timer = setTimeout(() => {
            console.log('MfaEnrollmentGate: Safety timeout reached');
            setLoading(false);
        }, 3000);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center">Loading Security Context...</div>;

    if (profile?.role === 'Provider' && !profile.mfa_enrolled_at) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-200">
                    <div className="mb-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🛡️</span>
                        </div>
                        <h2 className="text-2xl font-bold text-navy">MFA Required</h2>
                        <p className="text-slate-500 mt-2">
                            To access the EMR, you must enroll in 2-Factor Authentication.
                        </p>
                    </div>

                    <button
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                        onClick={() => {
                            if (window.confirm('Simulate MFA Enrollment (Demo)?')) {
                                localStorage.setItem('mfa_completed', 'true');
                                setProfile(prev => prev ? { ...prev, mfa_enrolled_at: new Date().toISOString() } : null);
                            }
                        }}
                    >
                        Enroll Now
                    </button>

                    <div className="mt-6 text-xs text-center text-slate-400">
                        HIPAA Security Rule §164.312(d) Compliance
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
