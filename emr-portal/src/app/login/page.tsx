"use client";

import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { ShieldCheck, Lock, Activity, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex bg-white font-sans overflow-hidden">
            {/* Left side: Hero Image and Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 z-0 opacity-40 grayscale"
                    style={{
                        backgroundImage: 'url("/emr-login-hero.png")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-700/80 via-transparent to-transparent z-10"></div>

                <div className="relative z-20 p-12 w-full max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center">
                                <span className="text-2xl font-black text-brand italic">P</span>
                            </div>
                            <h1 className="text-white text-3xl font-black tracking-tighter">
                                PATRIOTIC <span className="text-white/60 font-medium">VIRTUAL EMR</span>
                            </h1>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-5xl font-black text-white leading-none tracking-tight">
                                Secure. Compliant. <br />
                                <span className="text-brand-100">Patient-Centered.</span>
                            </h2>
                            <p className="text-white/70 text-lg font-medium max-w-md leading-relaxed">
                                Experience the future of medical care with our HIPAA-compliant platform designed for efficiency and security.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-8">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-white/10 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-white font-bold text-sm">HIPAA Compliant</p>
                                    <p className="text-white/40 text-xs">Fully secured data handling</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-white/10 rounded-lg">
                                    <Lock className="w-4 h-4 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-white font-bold text-sm">256-bit Encryption</p>
                                    <p className="text-white/40 text-xs">End-to-end data security</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Decorative element */}
                <div className="absolute bottom-12 right-12 flex items-center gap-2 text-white/20 select-none">
                    <Activity className="w-5 h-5 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.3em]">Network Active</span>
                </div>
            </div>

            {/* Right side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative">
                <div className="absolute top-8 right-8 lg:top-12 lg:right-12 hidden sm:block">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                        <ShieldCheck className="w-4 h-4 text-brand" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security Verified</span>
                    </div>
                </div>

                <div className="w-full max-w-md">
                    <LoginForm />

                    <div className="mt-12 text-center">
                        <div className="inline-flex items-center gap-6 px-6 py-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard</span>
                                <span className="text-xs font-bold text-slate-700">HITRUST</span>
                            </div>
                            <div className="h-4 w-[1px] bg-slate-200"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
                                <span className="text-xs font-bold text-slate-700">Certified</span>
                            </div>
                            <div className="h-4 w-[1px] bg-slate-200"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Protocol</span>
                                <span className="text-xs font-bold text-slate-700">OAuth 2.0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
