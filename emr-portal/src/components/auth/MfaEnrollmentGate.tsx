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
        const checkMfaStatus = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const token = await user.getIdToken();
                // In production, fetch from actual backend
                // For now, assume un-enrolled provider for demo
                // const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                // const data = await res.json();

                // MOCK PROFILE FOR DEMO (Simulating a Provider who hasn't enrolled)
                // In real app, remove this mock and use fetch
                const mockProfile = { role: 'Provider', mfa_enrolled_at: null };
                setProfile(mockProfile);

            } catch (error) {
                console.error('Failed to check MFA status', error);
            } finally {
                setLoading(false);
            }
        };

        checkMfaStatus();
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
                        onClick={() => alert('Starting MFA Enrollment Flow (SMS/TOTP)...')}
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
