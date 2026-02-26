"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { CheckCircle2, Calendar, Clock, User, ArrowRight, Sparkles, Phone } from 'lucide-react';
import { format } from 'date-fns';

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState('processing');
    const writtenRef = useRef(false);

    const patientName = searchParams.get('patientName');
    const service = searchParams.get('service');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const sessionId = searchParams.get('session_id');
    const appointmentId = searchParams.get('appointmentId');

    useEffect(() => {
        const createAppointment = async () => {
            if (writtenRef.current) return;
            writtenRef.current = true;

            try {
                if (appointmentId) {
                    // Update existing pending appointment
                    await updateDoc(doc(db, 'appointments', appointmentId), {
                        status: 'paid',
                        stripeSessionId: sessionId || 'mock_session',
                        updatedAt: serverTimestamp()
                    });
                } else {
                    // Fallback Add to Firestore
                    await addDoc(collection(db, 'appointments'), {
                        patient: patientName,
                        service: service,
                        date: date,
                        time: time,
                        type: 'video',
                        status: 'paid',
                        stripeSessionId: sessionId || 'mock_session',
                        createdAt: serverTimestamp()
                    });
                }

                setStatus('confirmed');
            } catch (err) {
                console.error('Firestore Error:', err);
                setStatus('error');
            }
        };

        if ((patientName && service && date && time) || appointmentId) {
            createAppointment();
        }
    }, [patientName, service, date, time, sessionId, appointmentId]);

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
                    Booking Confirmed <Sparkles className="text-brand" size={24} />
                </h1>
                <p className="text-slate-400 font-medium mb-12">Your appointment has been successfully scheduled and payment received.</p>

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

                    <div className="grid grid-cols-2 gap-8">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Date</span>
                                <span className="font-bold">{date ? format(new Date(date), 'MMM d, yyyy') : '...'}</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-orange-400 shrink-0">
                                <Clock size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Time</span>
                                <span className="font-bold">{time}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">What's Next?</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-brand/5 border border-brand/10 text-left">
                            <span className="block text-[10px] font-black text-brand uppercase mb-1">Confirmation Email</span>
                            <span className="text-[11px] text-slate-400 font-medium leading-relaxed">Check your inbox for session links and preparation steps.</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 text-left">
                            <span className="block text-[10px] font-black text-white uppercase mb-1">Telehealth Ready</span>
                            <span className="text-[11px] text-slate-400 font-medium leading-relaxed">Login 5 minutes before your slot to test your camera.</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/')}
                    className="w-full mt-12 bg-white text-navy py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-white/5"
                >
                    Return to Dashboard <ArrowRight size={18} />
                </button>

                <div className="mt-8 flex items-center justify-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Phone size={12} /> Support</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="flex items-center gap-1"><ShieldCheck size={12} /> HIPAA SECURE</span>
                </div>
            </div>
        </div>
    );
}

function ShieldCheck({ size }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>; }
