"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { AlertCircle, Lock, LogOut } from 'lucide-react';

const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const WARNING_THRESHOLD = 3 * 60 * 1000; // Warning at 12 minutes (3 mins remaining)

export function SecurityShell({ children }: { children: React.ReactNode }) {
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const router = useRouter();

    const logout = useCallback(async () => {
        try {
            await auth.signOut();
            // Clear browser cache/storage for security
            sessionStorage.clear();
            localStorage.removeItem('user_role');
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }, [router]);

    useEffect(() => {
        const handleActivity = () => {
            setLastActivity(Date.now());
            if (showWarning) setShowWarning(false);
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        events.forEach(event => window.addEventListener(event, handleActivity));

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastActivity;

            if (elapsed >= TIMEOUT_DURATION) {
                logout();
            } else if (elapsed >= (TIMEOUT_DURATION - WARNING_THRESHOLD)) {
                setShowWarning(true);
                setTimeLeft(Math.ceil((TIMEOUT_DURATION - elapsed) / 1000));
            }
        }, 1000);

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            clearInterval(interval);
        };
    }, [lastActivity, logout, showWarning]);

    return (
        <>
            {children}

            {/* Session Timeout Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 text-center mb-2">Session Expiring</h2>
                        <p className="text-slate-500 text-center mb-8 font-medium">
                            For security, your session will end in <span className="text-amber-600 font-black">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span> due to inactivity.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setLastActivity(Date.now())}
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                            >
                                Continue Working
                            </button>
                            <button
                                onClick={logout}
                                className="w-full bg-slate-50 text-slate-400 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                            >
                                Sign Out Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
