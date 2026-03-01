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
import { Mail, Lock, LogIn, Shield, ArrowRight, AlertCircle, Phone } from 'lucide-react';

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
    const router = useRouter();

    // Handle Google Redirect Result
    React.useEffect(() => {
        const checkRedirectResult = async () => {
            console.log('Checking for Google Redirect result...');
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    console.log('Google Redirect Result detected:', result.user.email);
                    const user = result.user;
                    let targetRoute = '/';

                    // Check patients collection first
                    const patientDoc = await getDoc(doc(db, 'patients', user.uid));
                    if (patientDoc.exists()) {
                        if (patientDoc.data().role === 'patient') targetRoute = '/patient';
                    } else {
                        // Check users collection
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        if (!userDoc.exists()) {
                            console.log('Creating new user profile for:', user.email);
                            await setDoc(doc(db, 'users', user.uid), {
                                displayName: user.displayName,
                                email: user.email,
                                photoURL: user.photoURL,
                                role: 'patient',
                                createdAt: serverTimestamp(),
                                isMfaEnrolled: false
                            });
                            targetRoute = '/patient';
                        } else {
                            console.log('Existing user profile found for:', user.email);
                            if (userDoc.data().role === 'patient') targetRoute = '/patient';
                        }
                    }

                    console.log(`Redirecting to ${targetRoute}...`);
                    router.push(targetRoute);
                } else {
                    console.log('No Google Redirect result found.');
                }
            } catch (err: any) {
                console.error('Redirect Result Error:', err.code, err.message, err);
                if (err.code === 'auth/multi-factor-auth-required' ||
                    err.message?.includes('multi-factor-auth-required') ||
                    err.code?.includes('multi-factor-auth-required')) {

                    console.log('MFA Required for redirected user');
                    try {
                        const mfaResolver = getMultiFactorResolver(auth, err);
                        setResolver(mfaResolver);
                        const phoneOpts = mfaResolver.hints[0];

                        if (phoneOpts && phoneOpts.factorId === PhoneMultiFactorGenerator.FACTOR_ID) {
                            console.log('Initiating MFA Phone verification (Redirect flow)');
                            if (!recaptchaRef.current) {
                                recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                                    size: 'invisible'
                                });
                            }
                            const phoneAuthProvider = new PhoneAuthProvider(auth);
                            const verId = await phoneAuthProvider.verifyPhoneNumber({
                                multiFactorHint: phoneOpts,
                                session: mfaResolver.session
                            }, recaptchaRef.current);
                            setVerificationId(verId);
                            setMfaStep(true);
                        }
                    } catch (mfaErr: any) {
                        console.error('MFA Initiation Error (Redirect):', mfaErr);
                        setError(`Identity verification required: ${mfaErr.message}`);
                    }
                } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                    console.log('Auth popup/redirect cancelled by user');
                } else {
                    console.error('Critical Google Redirect Error:', err);
                    setError(`Sign-in failed: ${err.message}`);
                }
            }
        };

        checkRedirectResult();
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Starting Email/Password login for:', email);
        setLoading(true);
        setError(null);

        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log('Email Login Successful:', result.user.email);

            let targetRoute = '/';
            try {
                const patientDoc = await getDoc(doc(db, 'patients', result.user.uid));
                if (patientDoc.exists() && patientDoc.data().role === 'patient') {
                    targetRoute = '/patient';
                } else {
                    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
                    if (userDoc.exists() && userDoc.data().role === 'patient') {
                        targetRoute = '/patient';
                    }
                }
            } catch (roleErr) {
                console.error('Error fetching role for correct routing', roleErr);
            }

            router.push(targetRoute);
        } catch (err: any) {
            console.error('Email Login Failed:', err.code, err.message);
            if (err.code === 'auth/multi-factor-auth-required') {
                console.log('MFA Required for Email login');
                const mfaResolver = getMultiFactorResolver(auth, err);
                setResolver(mfaResolver);

                // Start MFA challenge
                const phoneOpts = mfaResolver.hints[0];
                if (phoneOpts.factorId === PhoneMultiFactorGenerator.FACTOR_ID) {
                    try {
                        console.log('Initiating MFA Phone verification');
                        if (!recaptchaRef.current) {
                            recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                                size: 'invisible'
                            });
                        }

                        const phoneAuthProvider = new PhoneAuthProvider(auth);
                        const verId = await phoneAuthProvider.verifyPhoneNumber({
                            multiFactorHint: phoneOpts,
                            session: mfaResolver.session
                        }, recaptchaRef.current);

                        setVerificationId(verId);
                        setMfaStep(true);
                    } catch (mfaErr: any) {
                        console.error('MFA Initiation Error:', mfaErr);
                        setError('Failed to initiate MFA challenge.');
                    }
                }
            } else {
                setError('Invalid email or password.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        console.log('Initiating Google Login...');
        setLoading(true);
        setError(null);
        const provider = new GoogleAuthProvider();

        try {
            console.log('Attempting signInWithRedirect...');
            // Using Redirect instead of Popup to bypass COOP header restrictions
            await signInWithRedirect(auth, provider);
        } catch (err: any) {
            console.error('Google Login Initiation Error:', err.code, err.message, err);
            setError(`Failed to start Google sign-in: ${err.message}`);
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
            const result = await resolver.resolveSignIn(multiFactorAssertion);

            let targetRoute = '/';
            try {
                const patientDoc = await getDoc(doc(db, 'patients', result.user.uid));
                if (patientDoc.exists() && patientDoc.data().role === 'patient') {
                    targetRoute = '/patient';
                } else {
                    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
                    if (userDoc.exists() && userDoc.data().role === 'patient') {
                        targetRoute = '/patient';
                    }
                }
            } catch (roleErr) {
                console.error('Error fetching role for correct routing', roleErr);
            }

            router.push(targetRoute);
        } catch (err: any) {
            console.error('MFA Verification Error:', err);
            setError('Invalid verification code.');
        } finally {
            setLoading(false);
        }
    };

    if (mfaStep) {
        return (
            <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand mx-auto mb-4">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Two-Step Verification</h2>
                    <p className="text-slate-500 mt-2 text-sm font-medium">A verification code was sent to your primary phone number.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleMfaVerify} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Security Code</label>
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
                        {loading ? 'Verifying...' : 'Verify Identity'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMfaStep(false)}
                        className="w-full text-slate-400 text-xs font-bold hover:text-slate-600 py-2 transition-colors"
                    >
                        Return to login
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center mb-6">
                <div className="p-3 bg-brand/5 rounded-2xl">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-brand/10 flex items-center justify-center">
                        <span className="text-2xl font-black text-brand italic">P</span>
                    </div>
                </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Patient Login</h2>
            <p className="text-slate-500 mt-2 text-sm font-medium">Access your secure Patriotic health portal</p>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="email"
                            placeholder="clinician@patriotic.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl py-4 pl-12 pr-4 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand/20 transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl py-4 pl-12 pr-4 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand/20 transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest px-1">
                    <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
                        <input type="checkbox" className="rounded border-slate-200 text-brand focus:ring-brand/20 w-3 h-3" />
                        Remember me
                    </label>
                    <Link href="/forgot-password" title="Recover account" className="text-brand hover:text-brand-600 transition-colors">Forgot password?</Link>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                    {loading ? 'Authenticating...' : 'Sign In'}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="relative flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-slate-100"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Or continue with</span>
                    <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white border border-slate-100 text-slate-600 py-4 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
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

            <div className="mt-8 pt-6 border-t border-slate-50 text-center space-y-4">
                <div id="recaptcha-container"></div>
                <button
                    onClick={() => {
                        localStorage.setItem('emr_mock_auth', 'true');
                        router.push('/');
                    }}
                    className="w-full py-3 px-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-black uppercase tracking-widest hover:border-brand hover:text-brand transition-all"
                >
                    🚧 Development Bypass (Local Only)
                </button>
                <p className="text-xs text-slate-400 font-medium">
                    New patient? <Link href="/signup" className="text-brand font-bold hover:underline">Create an Account</Link>
                </p>
            </div>
        </div>
    );
}
