"use client";

import React from 'react';
import { Shield, BookOpen, Lock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#F0F9FF] py-20 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8 hover:text-[#0EA5E9] transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back to Login
                </Link>

                <div className="bg-white rounded-[40px] shadow-2xl shadow-sky-100 overflow-hidden border border-sky-50">
                    <div className="p-12 bg-[#0EA5E9] text-white relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <h1 className="text-4xl font-black tracking-tight mb-4 relative">Terms of Service</h1>
                        <p className="text-sky-100 font-bold opacity-80 uppercase tracking-widest text-xs">Last Updated: February 2024</p>
                    </div>

                    <div className="p-12 space-y-12 text-slate-600 leading-relaxed font-medium">
                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-[#0EA5E9]">
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                1. Acceptance of Terms
                            </h2>
                            <p>By accessing and using this Patient Portal, you agree to be bound by these Terms of Service. This platform is designed for telehealth consultations and medical information management. All users must be at least 18 years of age or have legal guardian consent.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-[#0EA5E9]">
                                    <Shield className="w-4 h-4" />
                                </div>
                                2. Medical Disclaimer
                            </h2>
                            <p className="p-6 bg-slate-50 rounded-3xl border border-slate-100 italic">
                                <strong>IMPORTANT:</strong> DO NOT USE THIS PORTAL FOR EMERGENCY MEDICAL NEEDS. If you are experiencing a medical emergency, call 911 or visit the nearest emergency room immediately.
                            </p>
                            <p className="mt-4">The health information provided through AI features like result interpretation or medication assistants is for informational purposes only and does not replace professional medical judgment.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-[#0EA5E9]">
                                    <Lock className="w-4 h-4" />
                                </div>
                                3. Privacy & Security
                            </h2>
                            <p>Your use of the portal is also governed by our Privacy Policy. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                        </section>

                        <div className="pt-12 border-t border-slate-100 italic text-sm text-slate-400">
                            Questions regarding these terms? Please contact our compliance office at compliance@patriotictelehealth.com
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
