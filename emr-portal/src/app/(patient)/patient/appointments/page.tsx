"use client";

import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Plus,
    Video,
    MapPin,
    Clock,
    ChevronRight,
    X,
    CheckCircle2,
    AlertCircle,
    User,
    ArrowRight,
    Camera,
    Mic,
    ShieldCheck,
    History,
    MoreVertical,
    Sparkles,
    ThumbsUp,
    ThumbsDown,
    Activity,
    Stethoscope,
    CreditCard,
    ArrowLeft,
    Info,
    ClipboardCheck,
    Search
} from 'lucide-react';
import { svcs, iQs } from '@/lib/catalog';
import { auth, db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    limit,
    startAfter,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { format, isAfter, subMinutes, addMinutes, isBefore, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
const Calendar = dynamic(() => import('react-calendar'), {
    ssr: false,
    loading: () => <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-3xl animate-pulse">Loading selector...</div>
});
import 'react-calendar/dist/Calendar.css';
import { logAuditEvent } from '@/lib/audit';
import { sanitize } from '@/lib/security';

// --- Types ---
interface Appointment {
    id: string;
    date: Timestamp;
    providerName: string;
    providerId: string;
    type: 'Telehealth' | 'In-Person';
    status: 'scheduled' | 'cancelled' | 'completed';
    reason: string;
    meetingUrl?: string;
    intakeAnswers?: Record<string, any>;
    serviceKey?: string;
}

interface Provider {
    id: string;
    name: string;
    specialty: string;
}

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(false);

    // Scheduling Flow State
    const [isScheduling, setIsScheduling] = useState(false);
    const [step, setStep] = useState(1);
    const [providers, setProviders] = useState<Provider[]>([]);

    // Form Values
    const [newAppt, setNewAppt] = useState({
        serviceKey: '',
        intake: {} as Record<string, any>,
        date: new Date(addDays(new Date(), 1).setHours(10, 0, 0, 0)),
    });

    // Checklist State
    const [joiningAppt, setJoiningAppt] = useState<Appointment | null>(null);
    const [checklist, setChecklist] = useState({
        camera: false,
        mic: false,
        idReady: false,
        quiet: false
    });

    // AI Summary State
    const [selectedSummary, setSelectedSummary] = useState<Appointment | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [aiSummary, setAiSummary] = useState<any>(null);
    const [feedbackSent, setFeedbackSent] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchAppointments(user.uid);
                fetchProviders();
            }
        });
        return () => unsubscribeAuth();
    }, [activeTab]);

    const fetchAppointments = async (uid: string, isNext: boolean = false) => {
        try {
            const apptsRef = collection(db, 'patients', uid, 'appointments');
            let q = query(
                apptsRef,
                orderBy('date', activeTab === 'upcoming' ? 'asc' : 'desc'),
                limit(20)
            );

            if (isNext && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));

            if (isNext) {
                setAppointments(prev => [...prev, ...data]);
            } else {
                setAppointments(data);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === 20);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            toast.error('Failed to load appointments');
            setLoading(false);
        }
    };

    const fetchProviders = async () => {
        try {
            const q = query(collection(db, 'users'), where('role', 'in', ['provider', 'doctor', 'admin']));
            const querySnapshot = await getDocs(q);
            const providerList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || data.displayName || 'Unnamed Provider',
                    specialty: data.specialty || (data.role === 'admin' ? 'Systems Administrator' : 'Clinical Provider')
                } as Provider;
            });
            setProviders(providerList);
        } catch (error) {
            console.error('Error fetching providers:', error);
            toast.error('Failed to load clinical providers');
        }
    };

    const handleSchedule = async () => {
        if (!auth.currentUser || !newAppt.serviceKey) return;
        setLoading(true);

        try {
            const token = await auth.currentUser.getIdToken();
            const service = svcs.find(s => s.k === newAppt.serviceKey);
            if (!service) throw new Error('Service not found');

            // 1. Create Consultation
            const consRes = await fetch('/api/v1/consultations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    serviceKey: newAppt.serviceKey,
                    intake: newAppt.intake,
                    stripeProductId: service.priceId
                })
            });

            if (!consRes.ok) throw new Error('Failed to create consultation');
            const consData = await consRes.json();

            // 2. Create Payment Session
            const payRes = await fetch('/api/v1/payments/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    priceId: service.priceId,
                    serviceKey: newAppt.serviceKey,
                    consultationId: consData.id,
                    uid: auth.currentUser.uid
                })
            });

            if (!payRes.ok) throw new Error('Payment initialization failed');
            const payData = await payRes.json();

            // 3. Redirect to Stripe
            window.location.href = payData.url;
        } catch (error: any) {
            console.error('Booking error:', error);
            toast.error(error.message || 'Failed to initialize booking');
            setLoading(false);
        }
    };

    const handleCancel = async (apptId: string) => {
        if (!auth.currentUser) return;

        const reason = window.prompt('Please enter a reason for cancellation:');
        if (reason === null) return;

        try {
            const apptRef = doc(db, 'patients', auth.currentUser.uid, 'appointments', apptId);
            await updateDoc(apptRef, {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: serverTimestamp()
            });

            toast.success('Appointment cancelled');
        } catch (error) {
            toast.error('Failed to cancel appointment');
        }
    };

    const handleViewSummary = async (appt: Appointment) => {
        setSelectedSummary(appt);
        setIsThinking(true);
        setFeedbackSent(false);
        // Simulate AI Delay
        await new Promise(r => setTimeout(r, 1200));

        // Mock AI scribe data
        const summaries: Record<string, any> = {
            'default': {
                complaint: appt.reason,
                findings: "Patient presents with symptoms as described. Clinical assessment confirms stable vitals. Further diagnostic review recommended to rule out secondary indicators.",
                plan: "Initiate supportive care regimen. Monitor symptoms for 7 days. Return if symptoms worsen or new indicators appear.",
                followUp: "Follow up with primary care in 2 weeks for results review."
            }
        };

        setAiSummary(summaries['default']);
        setIsThinking(false);
    };

    const handleFeedback = async (helpful: boolean) => {
        if (!auth.currentUser || !selectedSummary) return;

        try {
            const feedbackRef = collection(db, 'ai_feedback');
            await addDoc(feedbackRef, {
                userId: auth.currentUser.uid,
                type: 'visit_summary',
                resourceId: selectedSummary.id,
                helpful,
                timestamp: serverTimestamp()
            });
            setFeedbackSent(true);
            toast.success('Thank you for your feedback!');
        } catch (error) {
            toast.error('Failed to send feedback');
        }
    };

    const isJoinable = (apptDate: Timestamp) => {
        const date = apptDate.toDate();
        const now = new Date();
        return isAfter(now, subMinutes(date, 15)) && isBefore(now, addMinutes(date, 60));
    };

    const canCancel = (apptDate: Timestamp) => {
        return isAfter(apptDate.toDate(), addDays(new Date(), 1));
    };

    const upcoming = appointments.filter(a => a.status === 'scheduled' && isAfter(a.date.toDate(), subMinutes(new Date(), 60)));
    const past = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled' || isBefore(a.date.toDate(), subMinutes(new Date(), 60)));

    const filteredAppts = activeTab === 'upcoming' ? upcoming : past;

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-4 border-sky-100 border-t-[#0EA5E9] rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-8 pb-20 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Appointments</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Manage your upcoming care visits</p>
                </div>

                <div className="flex gap-4">
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'upcoming' ? 'bg-[#0EA5E9] text-white shadow-lg shadow-sky-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'past' ? 'bg-[#0EA5E9] text-white shadow-lg shadow-sky-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            History
                        </button>
                    </div>
                    <button
                        onClick={() => setIsScheduling(true)}
                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Book New
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredAppts.length > 0 ? filteredAppts.map((appt) => (
                    <div key={appt.id} className="bg-white rounded-[32px] border border-slate-50 shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center group hover:shadow-xl hover:shadow-sky-900/5 transition-all">
                        <div className="w-20 h-20 bg-[#F8FAFC] rounded-3xl flex flex-col items-center justify-center shrink-0 border border-slate-50">
                            <span className="text-[10px] font-black text-[#0EA5E9] uppercase">{format(appt.date.toDate(), 'MMM')}</span>
                            <span className="text-2xl font-black text-slate-800">{format(appt.date.toDate(), 'dd')}</span>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-2 min-w-0">
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight truncate">{appt.providerName}</h3>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${appt.status === 'scheduled' ? 'bg-sky-50 text-[#0EA5E9] border-sky-100' :
                                    appt.status === 'cancelled' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                                        'bg-slate-50 text-slate-400 border-slate-100'
                                    }`}>
                                    {appt.status}
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(appt.date.toDate(), 'h:mm a')}</div>
                                <div className="flex items-center gap-1.5">
                                    {appt.type === 'Telehealth' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                    {appt.type}
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm italic line-clamp-1">{appt.reason}</p>
                        </div>

                        <div className="shrink-0 w-full md:w-auto flex flex-col gap-2">
                            {appt.status === 'scheduled' && (
                                <>
                                    {isJoinable(appt.date) ? (
                                        <button
                                            onClick={() => setJoiningAppt(appt)}
                                            className="w-full md:w-48 bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-sky-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse"
                                        >
                                            <Video className="w-4 h-4" /> Join Now
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            {canCancel(appt.date) && (
                                                <button
                                                    onClick={() => handleCancel(appt.id)}
                                                    className="flex-1 md:w-24 bg-white text-rose-500 border border-rose-100 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-50 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedSummary(appt);
                                                    setIsThinking(false);
                                                }}
                                                className="flex-1 md:w-24 bg-white text-sky-600 border border-sky-100 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-50 transition-all shadow-sm"
                                            >
                                                View Intake
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                            {appt.status === 'completed' && (
                                <button
                                    onClick={() => handleViewSummary(appt)}
                                    className="w-full md:w-48 bg-slate-50 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border border-slate-100 hover:bg-white hover:text-[#0EA5E9] transition-all flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" /> View AI Summary
                                </button>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center space-y-4 bg-white rounded-[40px] border border-slate-50">
                        <CalendarIcon className="w-16 h-16 text-slate-100 mx-auto" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No appointments found</p>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-8">
                    <button
                        onClick={() => auth.currentUser && fetchAppointments(auth.currentUser.uid, true)}
                        className="px-10 py-4 bg-white text-slate-400 border border-slate-100 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#0EA5E9] hover:text-white transition-all shadow-sm hover:shadow-xl hover:shadow-sky-100 flex items-center gap-2"
                    >
                        Load More Appointments <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* SCHEDULING FLOW MODAL */}
            {isScheduling && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                        <div className="bg-[#0EA5E9] p-8 text-white flex justify-between items-center shrink-0 shadow-lg z-10">
                            <div className="flex items-center gap-4">
                                {step > 1 && (
                                    <button onClick={() => setStep(step - 1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                )}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Step {step} of 3</p>
                                    <h2 className="text-2xl font-black tracking-tight leading-none">
                                        {step === 1 && "Select Care Package"}
                                        {step === 2 && "Clinical Intake"}
                                        {step === 3 && "Review & Checkout"}
                                    </h2>
                                </div>
                            </div>
                            <button onClick={() => setIsScheduling(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            {step === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {svcs.map(s => (
                                        <VisitTypeCard
                                            key={s.k}
                                            icon={() => <span className="text-2xl">{s.icon}</span>}
                                            title={s.name}
                                            desc={`$${s.price} — ${s.cat}`}
                                            active={newAppt.serviceKey === s.k}
                                            onClick={() => {
                                                setNewAppt({ ...newAppt, serviceKey: s.k });
                                                setStep(2);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {(iQs[newAppt.serviceKey as keyof typeof iQs] || []).map((q: any) => (
                                        <div key={q.k} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                                            <label className="block text-sm font-black text-slate-800 mb-4">{q.l}</label>
                                            {q.t === 'yn' ? (
                                                <div className="flex gap-3">
                                                    {[
                                                        { label: 'Yes', value: true },
                                                        { label: 'No', value: false }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.label}
                                                            onClick={() => setNewAppt({
                                                                ...newAppt,
                                                                intake: { ...newAppt.intake, [q.k]: opt.value }
                                                            })}
                                                            className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${newAppt.intake[q.k] === opt.value ? 'bg-[#0EA5E9] text-white border-transparent' : 'bg-white text-slate-400 border-slate-100 hover:border-[#0EA5E9]'}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder={q.p || 'Type your answer...'}
                                                    value={newAppt.intake[q.k] || ''}
                                                    onChange={(e) => setNewAppt({
                                                        ...newAppt,
                                                        intake: { ...newAppt.intake, [q.k]: e.target.value }
                                                    })}
                                                    className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#0EA5E9]/10 focus:border-[#0EA5E9] transition-all"
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setStep(3)}
                                        className="w-full bg-[#0EA5E9] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-100 flex items-center justify-center gap-2"
                                    >
                                        Proceed to Review <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                                        <div className="flex justify-between items-center pb-6 border-b border-slate-200/50">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Service Selection</p>
                                                <h4 className="text-xl font-black text-slate-800">{svcs.find(s => s.k === newAppt.serviceKey)?.name}</h4>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Due</p>
                                                <h4 className="text-xl font-black text-emerald-600">${svcs.find(s => s.k === newAppt.serviceKey)?.price}</h4>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intake Summary</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {Object.entries(newAppt.intake).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between text-xs font-bold py-1 border-b border-slate-100 last:border-0">
                                                        <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                                        <span className="text-slate-800">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-5 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                        <ShieldCheck className="w-5 h-5" /> HIPAA Secured Payment Processing
                                    </div>

                                    <button
                                        onClick={handleSchedule}
                                        disabled={loading}
                                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CreditCard className="w-5 h-5" /> Pay & Book Appointment</>}
                                    </button>
                                </div>
                            )}
                        </div>

                        {step > 1 && (
                            <div className="p-6 pt-0 shrink-0 border-t border-slate-100 bg-slate-50/50">
                                <button onClick={() => setStep(step - 1)} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-[#0EA5E9]">
                                    Back to previous step
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PRE-VISIT CHECKLIST MODAL */}
            {joiningAppt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-slate-900 p-8 text-white text-center">
                            <h2 className="text-2xl font-black tracking-tight mb-2">Pre-Visit Checklist</h2>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Let's get ready for your visit</p>
                        </div>
                        <div className="p-8 space-y-4">
                            <CheckListItem
                                icon={Camera}
                                label="Camera Tested"
                                active={checklist.camera}
                                onClick={() => setChecklist({ ...checklist, camera: !checklist.camera })}
                            />
                            <CheckListItem
                                icon={Mic}
                                label="Microphone Tested"
                                active={checklist.mic}
                                onClick={() => setChecklist({ ...checklist, mic: !checklist.mic })}
                            />
                            <CheckListItem
                                icon={ShieldCheck}
                                label="Photo ID Ready"
                                active={checklist.idReady}
                                onClick={() => setChecklist({ ...checklist, idReady: !checklist.idReady })}
                            />
                            <CheckListItem
                                icon={MapPin}
                                label="Private Space"
                                active={checklist.quiet}
                                onClick={() => setChecklist({ ...checklist, quiet: !checklist.quiet })}
                            />

                            <button
                                disabled={!checklist.camera || !checklist.mic || !checklist.idReady || !checklist.quiet}
                                onClick={() => {
                                    if (joiningAppt.meetingUrl) window.open(joiningAppt.meetingUrl, '_blank');
                                    setJoiningAppt(null);
                                    setChecklist({ camera: false, mic: false, idReady: false, quiet: false });
                                }}
                                className="w-full bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-sky-100 disabled:opacity-30 mt-4 transition-all"
                            >
                                Enter Waiting Room
                            </button>
                            <button onClick={() => setJoiningAppt(null)} className="w-full text-xs font-black text-slate-400 uppercase tracking-widest text-center mt-2">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI VISIT SUMMARY MODAL */}
            {selectedSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                        <div className="bg-[#F5F3FF] p-10 flex justify-between items-start shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-600">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]">Generated by AI Scribe</span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Visit Summary</h2>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{selectedSummary.providerName} • {format(selectedSummary.date.toDate(), 'PPP')}</p>
                            </div>
                            <button onClick={() => setSelectedSummary(null)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-white/80 transition-colors shadow-sm relative z-10">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 overflow-y-auto flex-1">
                            {isThinking ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="w-12 h-12 border-4 border-purple-50 border-t-purple-600 rounded-full animate-spin"></div>
                                    <p className="text-xs font-black text-purple-400 uppercase tracking-widest animate-pulse">AI Scribe is parsing clinical findings...</p>
                                </div>
                            ) : (
                                <>
                                    {/* ALWAYS show Intake if available */}
                                    {selectedSummary.intakeAnswers && Object.keys(selectedSummary.intakeAnswers).length > 0 && (
                                        <div className="p-8 rounded-[2rem] border bg-slate-50 border-slate-100 shadow-inner">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
                                                    <ClipboardCheck className="w-4 h-4" />
                                                </div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clinical Intake Record</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                                {Object.entries(selectedSummary.intakeAnswers).map(([k, v]) => {
                                                    const serviceKey = selectedSummary.serviceKey || 'general_visit';
                                                    const question = (iQs[serviceKey as keyof typeof iQs] || []).find((q: any) => q.k === k);
                                                    return (
                                                        <div key={k} className="space-y-1.5 group">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] group-hover:text-indigo-400 transition-colors">
                                                                {question?.l || k.replace(/([A-Z])/g, ' $1')}
                                                            </p>
                                                            <div className="text-sm font-bold text-slate-800 bg-white/60 p-4 rounded-2xl border border-slate-200/50 shadow-sm">
                                                                {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Show AI Summary if available */}
                                    {aiSummary ? (
                                        <div className="space-y-6 animate-in fade-in duration-500 delay-150">
                                            <SummarySection title="Chief Complaint" content={aiSummary.complaint} />
                                            <SummarySection title="Clinical Findings" content={aiSummary.findings} />
                                            <SummarySection title="Assessment & Plan" content={aiSummary.plan} />
                                            <SummarySection title="Follow-Up Action" content={aiSummary.followUp} highlight />
                                        </div>
                                    ) : !isThinking && selectedSummary.status === 'scheduled' && (
                                        <div className="p-8 bg-sky-50 rounded-3xl border border-sky-100 text-sky-700">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Info className="w-5 h-5" />
                                                <h4 className="text-sm font-black uppercase tracking-widest">Appointment Confirmed</h4>
                                            </div>
                                            <p className="text-xs font-bold leading-relaxed">
                                                Your clinical intake has been successfully received. After your consultation, the AI Scribe will update this page with a detailed clinical summary and treatment plan.
                                            </p>
                                        </div>
                                    )}
                                    <SummarySection title="Clinical Findings" content={aiSummary.findings} />
                                    <SummarySection title="Assessment & Plan" content={aiSummary.plan} />
                                    <SummarySection title="Follow-Up Action" content={aiSummary.followUp} highlight />

                                    <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Was this summary helpful?</span>
                                            {!feedbackSent ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleFeedback(true)} className="p-2 bg-slate-50 rounded-lg hover:bg-emerald-50 hover:text-emerald-500 transition-colors"><ThumbsUp className="w-4 h-4" /></button>
                                                    <button onClick={() => handleFeedback(false)} className="p-2 bg-slate-50 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"><ThumbsDown className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Feedback Saved</span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">
                                        ✨ This summary is generated by AI from your visit transcript. It is intended for informational purposes. For clinical diagnosis or medical emergencies, please consult your doctor immediately.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummarySection({ title, content, highlight }: any) {
    return (
        <div className={`p-6 rounded-3xl border transition-all ${highlight ? 'bg-sky-50 border-sky-100' : 'bg-slate-50 border-slate-100'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${highlight ? 'text-[#0EA5E9]' : 'text-slate-400'}`}>{title}</h4>
            <p className={`text-sm leading-relaxed ${highlight ? 'text-[#0EA5E9] font-black' : 'text-slate-700 font-bold'}`}>{content}</p>
        </div>
    );
}

// --- Sub-Components ---

function VisitTypeCard({ icon: Icon, title, desc, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`p-6 rounded-[32px] border text-left transition-all flex items-center gap-6 group ${active ? 'bg-sky-50 border-[#0EA5E9] ring-2 ring-sky-100' : 'bg-white border-slate-100 hover:border-[#0EA5E9]'}`}
        >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${active ? 'bg-[#0EA5E9] text-white' : 'bg-slate-50 text-slate-300 group-hover:text-[#0EA5E9]'}`}>
                <Icon className="w-7 h-7" />
            </div>
            <div>
                <h4 className="font-black text-slate-800 tracking-tight">{title}</h4>
                <p className="text-xs text-slate-400 font-bold">{desc}</p>
            </div>
        </button>
    );
}

function CheckListItem({ icon: Icon, label, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
        >
            <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">{label}</span>
            </div>
            {active ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>}
        </button>
    );
}
