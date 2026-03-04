"use client";

import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    getMultiFactorResolver,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator,
    RecaptchaVerifier,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, LogIn, Shield, ArrowRight, AlertCircle, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mfaStep, setMfaStep] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [resolver, setResolver] = useState<any>(null);
    const [verificationId, setVerificationId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const recaptchaRef = React.useRef<RecaptchaVerifier | null>(null);
    const hasCheckedRedirectRef = React.useRef(false);
    const router = useRouter();

    const isMfaRequiredError = (authError: any) => {
        return authError?.code === 'auth/multi-factor-auth-required' ||
            authError?.message?.includes('multi-factor-auth-required') ||
            authError?.code?.includes('multi-factor-auth-required');
    };

    const startPhoneMfaChallenge = async (authError: any, flowLabel: string) => {
        try {
            const mfaResolver = getMultiFactorResolver(auth, authError);
            setResolver(mfaResolver);
            const phoneHint = mfaResolver.hints.find((hint: any) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID);
            if (!phoneHint) {
                setError('This account requires MFA, but no phone factor is available.');
                return;
            }
            console.log(`Initiating MFA Phone verification (${flowLabel})`);
            if (!recaptchaRef.current) {
                recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
            }
            const phoneAuthProvider = new PhoneAuthProvider(auth);
            const verificationToken = await phoneAuthProvider.verifyPhoneNumber({
                multiFactorHint: phoneHint,
                session: mfaResolver.session
            }, recaptchaRef.current);
            setVerificationId(verificationToken);
            setMfaStep(true);
        } catch (mfaError: any) {
            console.error(`MFA Initiation Error (${flowLabel}):`, mfaError);
            setError('Failed to initiate MFA challenge.');
        }
    };

    const upsertUserProfile = React.useCallback(async (user: any) => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                role: 'patient',
                createdAt: serverTimestamp(),
                isMfaEnrolled: false
            });
        }
    }, []);

    React.useEffect(() => {
        if (hasCheckedRedirectRef.current) return;
        hasCheckedRedirectRef.current = true;
        const checkRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    await upsertUserProfile(result.user);
                    router.replace('/');
                }
            } catch (err: any) {
                console.error('Redirect Result Error:', err.code, err.message, err);
                if (isMfaRequiredError(err)) {
                    await startPhoneMfaChallenge(err, 'Redirect flow');
                } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                    console.log('Auth popup/redirect cancelled by user');
                } else {
                    console.error('Critical Google Redirect Error:', err);
                    setError(`Sign-in failed: ${err.message}`);
                }
            }
        };
        checkRedirectResult();
    }, [router, upsertUserProfile]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/');
        } catch (err: any) {
            if (isMfaRequiredError(err)) {
                await startPhoneMfaChallenge(err, 'Email flow');
            } else {
                setError('Invalid email or password.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            const popupResult = await signInWithPopup(auth, provider);
            await upsertUserProfile(popupResult.user);
            router.replace('/');
        } catch (err: any) {
            if (isMfaRequiredError(err)) {
                await startPhoneMfaChallenge(err, 'Google flow');
                setLoading(false);
                return;
            }
            if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
                await signInWithRedirect(auth, provider);
                return;
            }
            if (err?.code !== 'auth/popup-closed-by-user') {
                setError(`Failed to start Google sign-in: ${err.message}`);
            }
            setLoading(false);
        }
    };

    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
            await resolver.resolveSignIn(multiFactorAssertion);
            router.replace('/');
        } catch (err: any) {
            setError('Invalid verification code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {mfaStep ? (
                <motion.div
                    key="mfa"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full space-y-8"
                >
                    <div className="space-y-2">
                        <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand mb-4">
                            <Fingerprint className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Identity Verification</h2>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            For your security, we've sent a 6-digit verification code to your registered device.
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleMfaVerify} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="mfa-security-code" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Security Code</label>
                            <input
                                id="mfa-security-code"
                                type="text"
                                placeholder="000 000"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-5 px-4 text-center text-4xl font-black tracking-[0.5em] text-slate-900 placeholder:text-slate-200 focus:border-brand/20 focus:bg-white transition-all outline-none"
                                maxLength={6}
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading || verificationCode.length < 6}
                                className="w-full bg-brand text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                            >
                                {loading ? 'Verifying...' : 'Confirm Identity'}
                                {!loading && <ArrowRight className="w-5 h-5" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMfaStep(false)}
                                className="w-full text-slate-400 text-xs font-bold hover:text-slate-600 py-2 transition-colors uppercase tracking-widest"
                            >
                                Cancel and return
                            </button>
                        </div>
                    </form>
                </motion.div>
            ) : (
                <motion.div
                    key="login"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full space-y-8"
                >
                    <div className="space-y-2">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">PATRIOTIC VIRTUAL EMR</h2>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Welcome back. Please authenticate to access your secure medical records and clinical updates.
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label htmlFor="patient-login-email" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Professional Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                                <input
                                    id="patient-login-email"
                                    type="email"
                                    placeholder="yourname@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-14 pr-4 text-slate-900 font-bold placeholder:text-slate-300 focus:border-brand/20 focus:bg-white transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-end ml-1">
                                <label htmlFor="patient-login-password" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
                                <Link href="/forgot-password" title="Recover account" className="text-[10px] font-black text-brand uppercase tracking-widest hover:text-brand-600 transition-colors">Recover</Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                                <input
                                    id="patient-login-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-14 pr-4 text-slate-900 font-bold placeholder:text-slate-300 focus:border-brand/20 focus:bg-white transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-1">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
                                <input type="checkbox" className="rounded-md border-slate-200 text-brand focus:ring-brand/20 w-4 h-4" />
                                Maintain active session
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-brand transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 group"
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                            {!loading && <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                        </button>

                        <div className="relative flex items-center gap-4 my-8">
                            <div className="flex-1 h-px bg-slate-100"></div>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] whitespace-nowrap">Secure Identity Provider</span>
                            <div className="flex-1 h-px bg-slate-100"></div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full bg-white border-2 border-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm shadow-sm hover:border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </form>

                    <div className="pt-6 border-t border-slate-50 text-center space-y-3">
                        <div id="recaptcha-container"></div>
                        <p className="text-xs text-slate-400 font-medium">
                            First time here? <Link href="/signup" className="text-brand font-black hover:underline underline-offset-4">Create your secure account</Link>
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
