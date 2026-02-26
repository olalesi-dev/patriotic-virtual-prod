"use client";

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ChevronLeft, Lock } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess(true);
        } catch (err: any) {
            console.error('Reset Error:', err);
            setError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-brand uppercase tracking-widest transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Login
                        </Link>
                    </div>

                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-6">
                            <div className="p-3 bg-brand/5 rounded-2xl">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-brand/10 flex items-center justify-center">
                                    <Lock className="w-6 h-6 text-brand" />
                                </div>
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Reset Password</h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium">We'll send you a link to recover your account</p>
                    </div>

                    {success ? (
                        <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm">
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                <p>Check your email! We've sent instructions to <strong>{email}</strong>.</p>
                            </div>
                            <Link
                                href="/login"
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest block hover:bg-slate-800 transition-all text-sm"
                            >
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-xl py-4 pl-12 pr-4 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand/20 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending link...' : 'Send Reset Link'}
                                {!loading && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
