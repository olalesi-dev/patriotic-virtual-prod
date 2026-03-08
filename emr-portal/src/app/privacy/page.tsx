"use client";

import React from 'react';
import { ShieldCheck, Eye, Database, ChevronLeft, Lock, CreditCard, Stethoscope, Pill, Microscope, Activity, MessageSquare, AlertCircle } from 'lucide-react';
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

                        {/* 0. EMERGENCY WARNING */}
                        <section className="p-8 bg-rose-50 rounded-[32px] border border-rose-100 flex gap-6 items-start">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 text-rose-500 shadow-sm">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-rose-500 mb-2 uppercase tracking-tight">🚨 No Emergency Care</h2>
                                <p className="text-sm font-bold text-rose-700/80 leading-relaxed">We do NOT treat medical emergencies. If you have chest pain, shortage of breath, severe bleeding, or any life-threatening emergency, call 911 or go to the nearest ER immediately.</p>
                            </div>
                        </section>

                        {/* 1. Telehealth Consent */}
                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-[#0EA5E9]">
                                    <Stethoscope className="w-5 h-5" />
                                </div>
                                1. Telehealth Consent
                            </h2>
                            <p>By using this service, you consent to receive medical care via electronic information and communication technologies. You understand that telehealth has limitations compared to in-person visits, including the inability to perform hands-on physical exams.</p>
                        </section>

                        {/* 2. Payment Policy */}
                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-[#0EA5E9]">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                2. Payment Policy (Cash-Pay Only)
                            </h2>
                            <p>Patriotic Virtual Telehealth is a <b>cash-pay only</b> practice. We do not accept or bill commercial insurance, Medicare, or Medicaid. All fees are due at the time of service. You agree that you will not submit claims to federal healthcare programs for these services.</p>
                        </section>

                        {/* 3. HIPAA & Privacy */}
                        <section className="p-10 bg-sky-50/50 rounded-[32px] border border-sky-100">
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3 text-[#0EA5E9]">
                                <Lock className="w-6 h-6" /> 3. HIPAA & Privacy
                            </h2>
                            <p className="text-sm font-bold text-slate-700 leading-relaxed">We are committed to protecting your medical information. We utilize HIPAA-compliant secure platforms for all video consults, messaging, and data storage. Your information will only be shared for treatment, payment, or healthcare operations, or as required by law.</p>
                        </section>

                        {/* 4. GLP-1 & Weight Loss */}
                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-[#0EA5E9]">
                                    <Pill className="w-5 h-5" />
                                </div>
                                4. GLP-1 & Weight Loss
                            </h2>
                            <p>For GLP-1 agonist prescriptions (e.g., Semaglutide/Tirzepatide), you acknowledge potential side effects including nausea, vomiting, and risk of thyroid C-cell tumors. You confirm you do not have a personal or family history of Medullary Thyroid Carcinoma (MTC) or MEN 2 syndrome.</p>
                        </section>

                        {/* 5. Radiology Services */}
                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-[#0EA5E9]">
                                    <Microscope className="w-5 h-5" />
                                </div>
                                5. Radiology Services
                            </h2>
                            <p>
                                <b>Educational Use (Tiers 1, 3, 4):</b> Services labeled "Educational" are for informational purposes only and do not constitute a formal diagnosis or replace your official medical records.<br /><br />
                                <b>Diagnostic Services (Clinical):</b> Official diagnostic reports are provided only for services explicitly labeled "Diagnostic" or "Clinical Consult".
                            </p>
                        </section>

                        {/* 6. Data Usage for AI */}
                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-[#0EA5E9]">
                                    <Activity className="w-5 h-5" />
                                </div>
                                6. Data Usage for AI & Analytics
                            </h2>
                            <p>By utilizing this platform, you expressly acknowledge and consent to the collection, aggregation, and anonymization of your de-identified health data and usage patterns. This information may be utilized for the purposes of internal analytics, quality improvement, and the training, validation, or enhancement of artificial intelligence and machine learning models, strictly in accordance with applicable laws and regulations ensuring patient privacy and data security.</p>
                        </section>

                        {/* 7. SMS Notifications */}
                        <section>
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-[#0EA5E9]">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                7. SMS Notifications & Communications
                            </h2>
                            <p>
                                Patriotic Virtual Telehealth may send SMS notifications to patients who have opted in. Messages include appointment booking confirmations, upcoming visit reminders, and in-platform notifications such as new messages from providers or pending action items.
                                <br /><br />
                                No marketing content will be sent via SMS. Message and data rates may apply. Reply STOP at any time to unsubscribe. Reply HELP for support.
                            </p>
                        </section>

                        <div className="pt-12 border-t border-slate-100 italic text-sm text-slate-400 font-bold uppercase tracking-widest text-center">
                            © 2026 Patriotic Health · All rights reserved · HIPAA Compliant
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
