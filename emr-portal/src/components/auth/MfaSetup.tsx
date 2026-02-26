"use client";

import React, { useState, useEffect } from 'react';
import {
    multiFactor,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator,
    RecaptchaVerifier
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Shield, Phone, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface MfaSetupProps {
    onComplete: () => void;
}

export function MfaSetup({ onComplete }: MfaSetupProps) {
    const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !recaptchaVerifier) {
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
            });
            setRecaptchaVerifier(verifier);
        }

        return () => {
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
            }
        };
    }, []);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber || !recaptchaVerifier) return;

        setLoading(true);
        setError(null);

        try {
            const session = await multiFactor(auth.currentUser!).getSession();
            const phoneInfoOptions = {
                phoneNumber: phoneNumber,
                session: session
            };
            const phoneAuthProvider = new PhoneAuthProvider(auth);
            const verId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
            setVerificationId(verId);
            setStep('code');
        } catch (err: any) {
            console.error('MFA Send Code Error:', err);
            setError(err.message || 'Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verificationCode || !verificationId) return;

        setLoading(true);
        setError(null);

        try {
            const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);

            await multiFactor(auth.currentUser!).enroll(multiFactorAssertion, 'Primary Phone');
            setStep('success');

            // Wait a moment so user sees success state
            setTimeout(() => {
                onComplete();
            }, 2000);
        } catch (err: any) {
            console.error('MFA Enrollment Error:', err);
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div id="recaptcha-container"></div>

            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand mx-auto mb-4">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Identity Verification</h2>
                <p className="text-slate-500 mt-2 text-sm font-medium">To protect sensitive patient data, HIPAA compliance requires Multi-Factor Authentication.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-shake">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {step === 'phone' && (
                <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Mobile Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="tel"
                                placeholder="+1 (555) 000-0000"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl py-4 pl-12 pr-4 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand/20 transition-all"
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !phoneNumber}
                        className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                        {loading ? 'Sending...' : 'Send Code'}
                        {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                </form>
            )}

            {step === 'code' && (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Verification Code</label>
                        <input
                            type="text"
                            placeholder="000000"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 text-center text-3xl font-black tracking-[0.5em] text-slate-900 placeholder:text-slate-200 focus:ring-2 focus:ring-brand/20 transition-all"
                            maxLength={6}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || verificationCode.length < 6}
                        className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? 'Verifying...' : 'Verify & Enroll'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep('phone')}
                        className="w-full text-slate-400 text-xs font-bold hover:text-slate-600 py-2 transition-colors"
                    >
                        Change phone number
                    </button>
                </form>
            )}

            {step === 'success' && (
                <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">MFA Enrolled Successfully</h3>
                    <p className="text-slate-500 text-sm font-medium px-4">Your account is now protected with 2-Factor Authentication. Redirecting to EMR...</p>
                </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-center gap-2">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Secure Healthcare Platform</span>
                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">HIPAA Compliant</span>
            </div>
        </div>
    );
}
