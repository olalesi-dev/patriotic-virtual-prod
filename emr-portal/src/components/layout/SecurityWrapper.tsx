"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    serverTimestamp
} from 'firebase/firestore';
import {
    ShieldAlert,
    Clock,
    LogOut,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const WARNING_THRESHOLD = 13 * 60 * 1000; // 13 minutes

export function SecurityWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [showConsent, setShowConsent] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const warningTimer = useRef<any>(null);
    const logoutTimer = useRef<any>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Check for Consent
                const consentRef = doc(db, 'consent', user.uid);
                const consentSnap = await getDoc(consentRef);
                if (!consentSnap.exists()) {
                    setShowConsent(true);
                }

                resetTimers();
            }
        });

        const activityHandler = () => {
            setLastActivity(Date.now());
            if (!showWarning) resetTimers();
        };

        window.addEventListener('mousemove', activityHandler);
        window.addEventListener('keydown', activityHandler);
        window.addEventListener('click', activityHandler);

        return () => {
            unsubscribe();
            window.removeEventListener('mousemove', activityHandler);
            window.removeEventListener('keydown', activityHandler);
            window.removeEventListener('click', activityHandler);
            clearTimeout(warningTimer.current);
            clearTimeout(logoutTimer.current);
        };
    }, [showWarning]);

    const resetTimers = () => {
        clearTimeout(warningTimer.current);
        clearTimeout(logoutTimer.current);

        warningTimer.current = setTimeout(() => {
            setShowWarning(true);
        }, WARNING_THRESHOLD);

        logoutTimer.current = setTimeout(() => {
            handleLogout('session_timeout');
        }, TIMEOUT_DURATION);
    };

    const handleLogout = async (reason: string = 'manual') => {
        const user = auth.currentUser;
        if (user) {
            try {
                await addDoc(collection(db, 'audit_logs'), {
                    userId: user.uid,
                    action: 'LOGOUT',
                    reason,
                    timestamp: serverTimestamp()
                });
            } catch (e) { console.error('Audit log failed', e); }
        }
        await auth.signOut();
        setShowWarning(false);
        router.push('/login');
        if (reason === 'session_timeout') {
            toast.error("Session expired for your security.", { icon: '🔐' });
        }
    };

    const handleStayLoggedIn = () => {
        setShowWarning(false);
        resetTimers();
    };

    const handleAcceptConsent = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await setDoc(doc(db, 'consent', user.uid), {
                accepted: true,
                acceptedAt: serverTimestamp(),
                version: '1.0'
            });
            setShowConsent(false);
            toast.success("Health Privacy Consent Recorded", { icon: '🛡️' });
        } catch (error) {
            toast.error("Failed to save consent");
        }
    };

    return (
        <>
            {children}

            {/* SESSION WARNING MODAL */}
            {showWarning && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in slide-in-from-bottom-8 duration-500 border border-amber-100">
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-8 shadow-inner">
                            <Clock className="w-10 h-10 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-4">Security Timeout</h2>
                        <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                            For your privacy, sessions expire after 15 minutes of inactivity. You will be logged out in <span className="text-amber-500 underline underline-offset-4 decoration-2">2 minutes</span>.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={handleStayLoggedIn}
                                className="w-full bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <ShieldCheck className="w-4 h-4" /> Stay Logged In
                            </button>
                            <button
                                onClick={() => handleLogout('manual')}
                                className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" /> Log Out Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONSENT BANNER */}
            {showConsent && (
                <div className="fixed inset-0 z-[201] flex items-end justify-center p-6 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-sky-100 flex flex-col md:flex-row animate-in slide-in-from-bottom-full duration-700">
                        <div className="bg-[#0EA5E9] md:w-48 p-8 flex flex-col items-center justify-center text-white shrink-0">
                            <ShieldAlert className="w-12 h-12 mb-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-center">Compliance Notice</span>
                        </div>
                        <div className="p-10 flex-1">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-4">Privacy & Health Data Consent</h3>
                            <p className="text-sm text-slate-600 font-bold leading-relaxed mb-8">
                                By continuing, you acknowledge that you have read and agree to our <a href="/terms" className="text-[#0EA5E9] underline">Terms of Service</a> and <a href="/privacy" className="text-[#0EA5E9] underline">Privacy Policy</a>. We process your data in accordance with HIPAA-readiness standards to ensure maximum medical privacy.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={handleAcceptConsent}
                                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-[#0EA5E9] transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> I Accept & Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Error Boundary Implementation
export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Critical Frontend Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-12 text-center border border-sky-50">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-8">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-4">Application Error</h2>
                        <p className="text-slate-500 font-bold mb-8 italic">We encountered a temporary technical issue. For your security, please refresh the page or try again later.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-100 hover:bg-slate-900 transition-all"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
