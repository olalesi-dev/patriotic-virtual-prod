"use client";

import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, FileText, Lock, X, ChevronDown } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function ConsentModal() {
    const [show, setShow] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (!user) return;
            setUid(user.uid);

            // Check if the user has already accepted
            try {
                const patientRef = doc(db, 'patients', user.uid);
                const snap = await getDoc(patientRef);
                const data = snap.exists() ? snap.data() : null;

                // Also check users collection as fallback
                if (!data?.consentAccepted) {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    const userData = userSnap.exists() ? userSnap.data() : null;
                    if (!userData?.consentAccepted) {
                        setShow(true);
                    }
                }
            } catch (e) {
                console.error('Consent check error:', e);
            }
        });
        return () => unsub();
    }, []);

    const handleAccept = async () => {
        if (!uid) return;
        setAccepting(true);
        try {
            const timestamp = serverTimestamp();
            // Write to both collections for coverage
            const patientRef = doc(db, 'patients', uid);
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
                await updateDoc(patientRef, { consentAccepted: true, consentAcceptedAt: timestamp });
            } else {
                await setDoc(patientRef, { consentAccepted: true, consentAcceptedAt: timestamp }, { merge: true });
            }

            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                await updateDoc(userRef, { consentAccepted: true, consentAcceptedAt: timestamp });
            }

            setShow(false);
        } catch (e) {
            console.error('Failed to save consent:', e);
        } finally {
            setAccepting(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-br from-[#0F172A] to-[#1E3A5F] p-8 text-white shrink-0">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <ShieldCheck className="w-7 h-7 text-sky-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight leading-tight">Privacy & Consent</h2>
                            <p className="text-sky-300 text-xs font-bold uppercase tracking-widest mt-1">HIPAA-Compliant Care Portal</p>
                        </div>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed font-medium">
                        Before accessing your health portal, please review and accept our privacy practices and patient consent forms. This is required by HIPAA regulations.
                    </p>
                </div>

                {/* Scrollable Content */}
                <div
                    className="flex-1 overflow-y-auto p-8 space-y-6"
                    onScroll={(e) => {
                        const el = e.currentTarget;
                        setIsScrolled(el.scrollTop + el.clientHeight >= el.scrollHeight - 20);
                    }}
                >
                    <PolicySection icon={Lock} title="HIPAA Notice of Privacy Practices">
                        Patriotic Virtual Telehealth ("Practice") is required by law to maintain the privacy of your protected health information (PHI) and to provide you with notice of our legal duties and privacy practices with respect to your PHI. We are required to abide by the terms of this Notice currently in effect.
                        <br /><br />
                        <strong>How We Use Your Information:</strong> We may use and disclose your health information for treatment purposes (coordinating your care with other healthcare providers), payment purposes (billing and claims), and healthcare operations (quality improvement, training).
                        <br /><br />
                        <strong>Your Rights:</strong> You have the right to request restrictions on uses/disclosures, access your records, request amendments, receive an accounting of disclosures, and receive this notice in paper form.
                    </PolicySection>

                    <PolicySection icon={FileText} title="Telehealth Informed Consent">
                        I understand that telehealth involves the delivery of healthcare services using electronic communications, including video conferencing. I understand that:
                        <br /><br />
                        • Telehealth may involve electronic communication of my personal medical information to other health practitioners who may be located in other areas<br />
                        • I have the right to withhold or withdraw my consent to the use of telehealth in the course of my care at any time<br />
                        • The laws that protect the confidentiality of my medical information also apply to telehealth<br />
                        • I understand that technical difficulties may interrupt or prevent complete telehealth visits
                    </PolicySection>

                    <PolicySection icon={ShieldCheck} title="Patient Rights & Responsibilities">
                        As a patient of Patriotic Virtual Telehealth, you have the right to:
                        <br /><br />
                        • Receive respectful care that recognizes your dignity and privacy<br />
                        • Receive a clear explanation of your condition and treatment options<br />
                        • Participate in decisions about your healthcare<br />
                        • Have your medical records kept confidential<br />
                        • Access your personal health information<br /><br />
                        You are responsible for providing accurate and complete health information to your care providers and for following the agreed-upon treatment plan.
                    </PolicySection>

                    <div className="h-4" /> {/* Spacer to ensure scroll reaches bottom */}
                </div>

                {/* Scroll Indicator */}
                {!isScrolled && (
                    <div className="flex items-center justify-center gap-2 py-2 text-slate-400 text-xs font-bold animate-bounce bg-white dark:bg-slate-800">
                        <ChevronDown className="w-4 h-4" /> Scroll to read all policies
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 shrink-0">
                    <div className="flex items-start gap-3 mb-4 bg-sky-50 border border-sky-100 rounded-2xl p-4">
                        <CheckCircle2 className="w-5 h-5 text-sky-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            By clicking <strong>"I Accept"</strong>, you confirm that you have read and agree to Patriotic Virtual Telehealth's <a href="/privacy-policy" className="text-[#0EA5E9] underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, HIPAA Notice of Privacy Practices, Telehealth Informed Consent, and Patient Rights & Responsibilities.
                        </p>
                    </div>
                    <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-sky-200 hover:shadow-sky-300 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                        {accepting ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                        ) : (
                            <><ShieldCheck className="w-5 h-5" /> I Accept All Policies</>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3">
                        🔐 Encrypted · HIPAA Secure · Required Before Access
                    </p>
                </div>
            </div>
        </div>
    );
}

function PolicySection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#0EA5E9]" />
                </div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">{title}</h3>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-700">
                {children}
            </div>
        </div>
    );
}
