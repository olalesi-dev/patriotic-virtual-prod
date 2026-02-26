"use client";

import React from 'react';
import { ShieldCheck, Eye, Database, ChevronLeft, Lock } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#F0F9FF] py-20 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8 hover:text-[#0EA5E9] transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back to Login
                </Link>

                <div className="bg-white rounded-[40px] shadow-2xl shadow-sky-100 overflow-hidden border border-sky-50">
                    <div className="p-12 bg-slate-900 text-white relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0EA5E9] rounded-full -mr-32 -mt-32 blur-3xl opacity-20"></div>
                        <h1 className="text-4xl font-black tracking-tight mb-4 relative">Privacy Policy</h1>
                        <p className="text-[#0EA5E9] font-bold uppercase tracking-widest text-xs">HIPAA-Compliance & Data Protection</p>
                    </div>

                    <div className="p-12 space-y-12 text-slate-600 leading-relaxed font-medium">
                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-[#0EA5E9]">
                                    <Database className="w-4 h-4" />
                                </div>
                                1. Information We Collect
                            </h2>
                            <p>We collect Protected Health Information (PHI) provided by you during intake, medical history surveys, and consultations. This includes clinical notes, lab results, and imaging studies necessary for your care.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-[#0EA5E9]">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                2. How We Use Data
                            </h2>
                            <p>Data is used exclusively for providing healthcare services, processing payments, and improving patient outcomes. We do not sell your medical data to third parties for marketing purposes.</p>
                        </section>

                        <section className="p-10 bg-sky-50/50 rounded-[32px] border border-sky-100">
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3 text-[#0EA5E9]">
                                <Lock className="w-5 h-5" /> HIPAA Safeguards
                            </h2>
                            <p className="text-sm font-bold text-slate-700">We implement industry-standard administrative, physical, and technical safeguards to protect your PHI, including AES-256 encryption at rest, TLS 1.3 encryption in transit, and granular audit logging of all data access.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-[#0EA5E9]">
                                    <Eye className="w-4 h-4" />
                                </div>
                                3. Patient Rights
                            </h2>
                            <p>Under HIPAA and related regulations, you have the right to request access to your records, request amendments to medical information, and receive an accounting of disclosures made by the portal.</p>
                        </section>

                        <div className="pt-12 border-t border-slate-100 italic text-sm text-slate-400">
                            Managed by Patriotic Health. Security Officer: security@patriotictelehealth.com
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
