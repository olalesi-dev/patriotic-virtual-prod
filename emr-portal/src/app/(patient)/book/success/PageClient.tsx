"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { signInWithCustomToken, type User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { CheckCircle2, Clock, User, ArrowRight, Sparkles, Phone, ShieldCheck } from 'lucide-react';
import { VouchedVerification } from '@/components/auth/VouchedVerification';
import type { IdentityVerificationStatus, VouchedCompletionResponse } from '@/lib/identity-verification';
import { useIdentityVerificationProfile } from '@/hooks/useIdentityVerificationProfile';

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState('processing');
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => auth.currentUser);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [verificationOutcome, setVerificationOutcome] = useState<IdentityVerificationStatus | null>(null);
    const writtenRef = useRef(false);
    const verificationProfile = useIdentityVerificationProfile(currentUser);

    const patientName = searchParams.get('patientName');
    const service = searchParams.get('service');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const sessionId = searchParams.get('session_id');
    const appointmentId = searchParams.get('appointmentId');
    const consultationId = searchParams.get('consultationId');  // passed from main site
    const bridgeToken = searchParams.get('token');               // cross-domain SSO token

    useEffect(() => {
        return auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
        });
    }, []);

    useEffect(() => {
        const init = async () => {
            if (writtenRef.current) return;
            writtenRef.current = true;

            try {
                // 1. Auto sign-in via bridge token if provided (cross-domain SSO)
                if (bridgeToken) {
                    try {
                        await signInWithCustomToken(auth, bridgeToken);
                        console.log('Cross-domain SSO: signed in via bridge token');
                    } catch (ssoErr) {
                        // Non-fatal: token may have expired if user took too long
                        console.warn('Bridge token sign-in failed (may have expired):', ssoErr);
                    }
                    // Remove token from URL bar immediately for security
                    const cleanUrl = new URL(window.location.href);
                    cleanUrl.searchParams.delete('token');
                    window.history.replaceState({}, '', cleanUrl.toString());
                }

                // 2. If we have a consultationId from the main site flow,
                //    the main site already wrote all the Firestore records — just confirm.
                if (consultationId && !appointmentId) {
                    setStatus('confirmed');
                    return;
                }

                // 3. Legacy: write records if arrived from EMR portal booking flow
                if (appointmentId) {
                    await updateDoc(doc(db, 'appointments', appointmentId), {
                        status: 'PENDING_SCHEDULING',
                        stripeSessionId: sessionId || 'mock_session',
                        updatedAt: serverTimestamp()
                    });
                } else if (patientName && service) {
                    await addDoc(collection(db, 'appointments'), {
                        patient: patientName,
                        service: service,
                        date: date || 'TBD',
                        time: time || 'TBD',
                        type: 'video',
                        status: 'PENDING_SCHEDULING',
                        stripeSessionId: sessionId || 'mock_session',
                        createdAt: serverTimestamp()
                    });
                }

                setStatus('confirmed');
            } catch (err) {
                console.error('Success page error:', err);
                setStatus('error');
            }
        };

        init();
    }, [patientName, service, date, time, sessionId, appointmentId, consultationId, bridgeToken]);

    useEffect(() => {
        if (verificationProfile.loading) {
            return;
        }

        if (verificationProfile.status === 'verified' || verificationProfile.status === 'review_required') {
            setVerificationOutcome(verificationProfile.status);
        }
    }, [verificationProfile.loading, verificationProfile.status]);

    const handleVerificationCompleted = React.useCallback((result: VouchedCompletionResponse) => {
        setVerificationError(null);

        if (result.verified) {
            setVerificationOutcome('verified');
            return;
        }

        if (result.status === 'review_required') {
            setVerificationOutcome('review_required');
            setVerificationError(result.warningMessage || 'Identity verification was submitted and is pending manual review.');
            return;
        }

        setVerificationError(result.failureReason || 'Identity verification failed. Please try again or contact support.');
    }, []);

    const handleVerificationError = React.useCallback((message: string) => {
        setVerificationError(message);
    }, []);

    const isVerificationResolved = verificationOutcome === 'verified' || verificationOutcome === 'review_required';

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-[#0A0F1C] text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-black text-red-400 mb-4">Something went wrong</h1>
                    <p className="text-slate-400 font-medium mb-8">Your payment was successful, but we had trouble saving your appointment.</p>
                    <button onClick={() => window.location.reload()} className="bg-brand text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest">Retry Connection</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0F1C] text-white flex items-center justify-center p-4 selection:bg-brand selection:text-white overflow-hidden">

            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            <div className="max-w-xl w-full p-8 md:p-12 rounded-[48px] bg-slate-900/80 backdrop-blur-2xl border border-white/5 shadow-[0_32px_100px_rgba(0,0,0,0.5)] relative z-10 text-center animate-in fade-in zoom-in-95 duration-700">

                <div className="relative mb-12">
                    <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto relative z-10 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-in slide-in-from-bottom-4 duration-1000">
                        <CheckCircle2 size={48} />
                    </div>
                    <div className="absolute inset-0 w-24 h-24 bg-emerald-400 rounded-full blur-2xl opacity-20 mx-auto animate-ping"></div>
                </div>

                <h1 className="text-4xl font-black tracking-tight mb-4 flex items-center justify-center gap-3">
                    Priority Queue Confirmed <Sparkles className="text-brand" size={24} />
                </h1>
                <p className="text-slate-400 font-medium mb-12">
                    Thank you for your payment. Your case has been prioritized. To ensure the best clinical match, one of our providers will contact you directly to finalize your appointment time.
                </p>

                <div className="bg-white/5 rounded-3xl p-8 text-left space-y-6 border border-white/5 mb-12">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-brand shrink-0">
                            <User size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Patient</span>
                            <span className="font-bold text-lg">{patientName}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                            <Clock size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Expected Outreach</span>
                            <span className="font-bold">7:00 AM — 7:00 PM (EST)</span>
                        </div>
                    </div>
                </div>

                {status === 'processing' ? (
                    <div className="mb-12 rounded-3xl border border-sky-500/20 bg-sky-500/10 px-6 py-5 text-left">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300 mb-2">Finalizing</p>
                        <p className="text-sm font-medium text-slate-200">We are still finishing the appointment confirmation. This page will update automatically.</p>
                    </div>
                ) : null}

                {status === 'confirmed' && !isVerificationResolved ? (
                    <div className="mb-12 rounded-[32px] border border-white/10 bg-white/5 p-6 md:p-8 text-left">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-300 flex items-center justify-center">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Required Next Step</p>
                                <h2 className="text-2xl font-black text-white">Complete Identity Verification</h2>
                            </div>
                        </div>
                        <p className="text-sm text-slate-300 font-medium leading-6 mb-6">
                            Your booking is confirmed. Complete the secure ID check now so our clinical team can continue processing this appointment.
                        </p>
                        {verificationError ? (
                            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                                {verificationError}
                            </div>
                        ) : null}
                        {!currentUser ? (
                            <div className="rounded-2xl bg-white px-6 py-12 text-center text-slate-600 font-semibold">
                                Sign in again to complete identity verification for this appointment.
                            </div>
                        ) : verificationProfile.loading ? (
                            <div className="rounded-2xl bg-white px-6 py-12 text-center text-slate-600 font-semibold">
                                Loading your secure verification details...
                            </div>
                        ) : (
                            <VouchedVerification
                                user={currentUser}
                                firstName={verificationProfile.firstName}
                                lastName={verificationProfile.lastName}
                                email={verificationProfile.email}
                                phone={verificationProfile.phone}
                                birthDate={verificationProfile.birthDate}
                                onCompleted={handleVerificationCompleted}
                                onError={handleVerificationError}
                            />
                        )}
                    </div>
                ) : null}

                {status === 'confirmed' && verificationOutcome === 'verified' ? (
                    <div className="mb-12 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-5 text-left">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300 mb-2">Verification Complete</p>
                        <p className="text-sm font-medium text-slate-100">Your identity has been verified and attached to this appointment.</p>
                    </div>
                ) : null}

                {status === 'confirmed' && verificationOutcome === 'review_required' ? (
                    <div className="mb-12 rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-5 text-left">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200 mb-2">Manual Review Pending</p>
                        <p className="text-sm font-medium text-slate-100">Your ID check was submitted successfully and is pending manual review. Our team will continue processing your appointment.</p>
                    </div>
                ) : null}

                <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Outreach Protocol</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-brand/5 border border-brand/10 text-left">
                            <span className="block text-[10px] font-black text-brand uppercase mb-1">Provider Callback</span>
                            <span className="text-[11px] text-slate-400 font-medium leading-relaxed">A licensed healthcare provider will reach out via your registered phone number or email.</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 text-left">
                            <span className="block text-[10px] font-black text-white uppercase mb-1">Clinical Matching</span>
                            <span className="text-[11px] text-slate-400 font-medium leading-relaxed">We are currently matching your intake records with the most appropriate clinical specialist.</span>
                        </div>
                    </div>
                </div>

                {status === 'confirmed' && isVerificationResolved ? (
                    <button
                        onClick={() => router.push('/patient')}
                        className="w-full mt-12 bg-white dark:bg-slate-800 text-navy py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-white/5"
                    >
                        Return to Dashboard <ArrowRight size={18} />
                    </button>
                ) : !currentUser ? (
                    <button
                        onClick={() => router.push('/patient')}
                        className="w-full mt-12 bg-white dark:bg-slate-800 text-navy py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-white/5"
                    >
                        Sign In to Verify <ArrowRight size={18} />
                    </button>
                ) : null}

                <div className="mt-8 flex items-center justify-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Phone size={12} /> Support</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="flex items-center gap-1">🛡️ HIPAA SECURE</span>
                </div>
            </div>
        </div>
    );
}
