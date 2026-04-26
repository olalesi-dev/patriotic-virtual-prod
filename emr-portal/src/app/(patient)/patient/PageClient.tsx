"use client";

import React, { useState, useEffect } from 'react';
import {
    Activity,
    Calendar,
    MessageSquare,
    Pill,
    ArrowRight,
    Clock,
    Plus,
    FileText,
    AlertCircle,
    CheckCircle2,
    History,
    X,
    Send,
    ShieldCheck,
    Bell,
    Gift
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { apiFetchJson } from '@/lib/api-client';
import {
    collection,
    query,
    where,
    limit,
    onSnapshot,
    Timestamp,
    getDocs
} from 'firebase/firestore';
import { format, isSameDay, isAfter, subMinutes, addMinutes } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { isTelehealthJoinAvailable } from '@/lib/telehealth-join';

// --- Types ---
interface Appointment {
    id: string;
    date: Timestamp;
    providerName: string;
    type: string;
    status: string;
    meetingUrl?: string;
}

interface Message {
    id: string;
    providerName: string;
    lastMessage: string;
    lastMessageAt: Timestamp;
    unreadCount: number;
}

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    status: 'active' | 'discontinued';
}

interface LabResult {
    id: string;
    testName: string;
    date: Timestamp;
    status: 'Normal' | 'Review Needed' | 'Critical';
    value: string;
}

interface SendMessageApiResponse {
    success?: boolean;
    error?: string;
}

export default function PatientDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Data States
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [labResults, setLabResults] = useState<LabResult[]>([]);

    // Compose Messaging State
    const [isMessagingOpen, setIsMessagingOpen] = useState(false);
    const [providers, setProviders] = useState<any[]>([]);
    const [composeData, setComposeData] = useState({
        recipientId: '',
        recipientName: '',
        subject: '',
        category: 'General',
        body: ''
    });
    const [isSendingMsg, setIsSendingMsg] = useState(false);

    const fetchProvidersForMessaging = async () => {
        try {
            const q = query(collection(db, 'users'), where('role', 'in', ['provider', 'doctor', 'admin']));
            const snip = await getDocs(q);
            setProviders(snip.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name || data.displayName || 'Unnamed Provider',
                    specialty: data.specialty || (data.role === 'admin' ? 'Systems Administrator' : 'Clinical Provider')
                };
            }));
        } catch (e) {
            console.error('Error fetching providers:', e);
        }
    };

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setupRealtimeListeners(currentUser.uid);
                fetchProvidersForMessaging();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const setupRealtimeListeners = (uid: string) => {
        let consultData: Appointment[] = [];
        let subApptData: Appointment[] = [];

        // Helper: safe date conversion
        const toDate = (v: any): Date | null => {
            if (!v) return null;
            if (typeof v.toDate === 'function') return v.toDate();
            if (v instanceof Date) return v;
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : d;
        };

        const mergeAppts = () => {
            const byKey = new Map<string, Appointment>();
            // Sub-collection takes precedence (has updated status)
            consultData.forEach(c => byKey.set(c.id, c));
            subApptData.forEach(a => byKey.set((a as any).consultationId || a.id, a));

            const merged = Array.from(byKey.values())
                .filter(a => a.status !== 'cancelled' && a.status !== 'completed' && a.status !== 'PENDING_SCHEDULING')
                .sort((a, b) => {
                    const aMs = toDate((a as any).scheduledAt || a.date)?.getTime() ?? 0;
                    const bMs = toDate((b as any).scheduledAt || b.date)?.getTime() ?? 0;
                    return aMs - bMs;
                })
                .slice(0, 3);
            setAppointments(merged);
        };

        // 1a. Consultations with paymentStatus=paid (single-field filter, no composite index needed)
        const unsubConsult = onSnapshot(
            query(collection(db, 'consultations'), where('uid', '==', uid)),
            (snap) => {
                consultData = snap.docs
                    .map(d => {
                        const raw = d.data();
                        const rawStatus = (raw.status || '').toLowerCase();
                        // Only show paid consultations
                        if (raw.paymentStatus && raw.paymentStatus !== 'paid') return null;
                        return {
                            id: d.id,
                            providerName: raw.providerName || 'Patriotic Provider',
                            type: 'Telehealth',
                            status: rawStatus === 'waitlist' ? 'PENDING_SCHEDULING' :
                                rawStatus === 'scheduled' ? 'scheduled' : 'PENDING_SCHEDULING',
                            // Prefer actual appointment timing fields before the creation timestamp.
                            date: raw.scheduledAt || raw.startTime || raw.date || raw.createdAt,
                            meetingUrl: raw.meetingUrl,
                        } as Appointment;
                    })
                    .filter(Boolean) as Appointment[];
                mergeAppts();
            },
            (err) => { console.error('Dashboard consultations error:', err); setLoading(false); }
        );

        // 1b. patients/{uid}/appointments sub-collection (no ordering = no index needed)
        const unsubSubAppt = onSnapshot(
            query(collection(db, 'patients', uid, 'appointments')),
            (snap) => {
                subApptData = snap.docs.map(d => {
                    const raw = d.data();
                    const rawStatus = (raw.status || '').toLowerCase();
                    return {
                        id: d.id,
                        consultationId: raw.consultationId,
                        providerName: raw.providerName || 'Patriotic Provider',
                        type: raw.type || 'Telehealth',
                        status: rawStatus === 'waitlist' ? 'PENDING_SCHEDULING' : (rawStatus || 'PENDING_SCHEDULING'),
                        scheduledAt: raw.scheduledAt || raw.date || null,
                        date: raw.startTime || raw.scheduledAt || raw.date || raw.createdAt,
                        meetingUrl: raw.meetingUrl,
                    } as Appointment;
                });
                mergeAppts();
                setLoading(false); // resolve loading after first merge
            },
            (err) => { console.error('Dashboard subappt error:', err); setLoading(false); }
        );

        // 2. Messages (no composite index: remove unreadCount filter, filter client-side)
        const unsubMsgs = onSnapshot(
            query(collection(db, 'threads'), where('patientId', '==', uid), limit(5)),
            (snap) => {
                const msgs = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Message))
                    .filter(m => m.unreadCount > 0)
                    .slice(0, 2);
                setMessages(msgs);
            },
            (err) => console.error('Dashboard messages error:', err)
        );

        // 3. Medications
        const unsubMeds = onSnapshot(
            query(collection(db, 'patients', uid, 'medications'), where('status', '==', 'active')),
            (snap) => setMedications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Medication))),
            (err) => console.error('Dashboard medications error:', err)
        );

        // 4. Lab results (no ordering = no index needed, sort client-side)
        const unsubLabs = onSnapshot(
            query(collection(db, 'patients', uid, 'lab_results'), limit(5)),
            (snap) => {
                const labs = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as LabResult))
                    .sort((a, b) => {
                        const aMs = typeof a.date?.toDate === 'function' ? a.date.toDate().getTime() : 0;
                        const bMs = typeof b.date?.toDate === 'function' ? b.date.toDate().getTime() : 0;
                        return bMs - aMs;
                    })
                    .slice(0, 1);
                setLabResults(labs);
                setLoading(false);
            },
            (err) => { console.error('Dashboard labs error:', err); setLoading(false); }
        );

        return () => {
            unsubConsult();
            unsubSubAppt();
            unsubMsgs();
            unsubMeds();
            unsubLabs();
        };
    };


    const safeDate = (v: any): Date | null => {
        if (!v) return null;
        if (typeof v.toDate === 'function') return v.toDate();
        if (v instanceof Date) return v;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    };

    const isJoinable = (apptDate: any) => isTelehealthJoinAvailable(apptDate);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser || !composeData.recipientId) return;

        setIsSendingMsg(true);
        try {
            const payload = await apiFetchJson<SendMessageApiResponse>('/api/messages/send', {
                method: 'POST',
                user: auth.currentUser,
                body: {
                    recipientId: composeData.recipientId,
                    recipientType: 'provider',
                    subject: composeData.subject,
                    category: composeData.category,
                    body: composeData.body
                }
            });
            if (!payload.success) {
                throw new Error(payload.error || 'Failed to send message.');
            }

            setIsMessagingOpen(false);
            setComposeData({ recipientId: '', recipientName: '', subject: '', category: 'General', body: '' });
            toast.success('Message sent to provider');
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setIsSendingMsg(false);
        }
    };

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-0">
            {/* WELCOME BANNER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        Healthy morning, <span className="text-[#0EA5E9]">{user?.displayName?.split(' ')[0] || 'Patient'}</span>
                    </h1>
                    <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-xs flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> {format(new Date(), 'EEEE, MMMM do, yyyy')}
                    </p>
                </div>
            </div>

            {/* 24-HOUR PROVIDER CONTACT BANNER — shown when patient has pending booking */}
            {appointments.some(a => (a.status as any) === 'PENDING_SCHEDULING') && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-800/50 rounded-[24px] p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-black text-amber-900 text-sm tracking-tight">Your visit request is confirmed!</p>
                        <p className="text-amber-700/80 text-xs font-medium mt-0.5 leading-relaxed">
                            A provider will contact you within <strong>24 hours</strong> to finalize your appointment time. Keep an eye on your phone and email.
                        </p>
                    </div>
                    <button onClick={() => router.push('/patient/appointments')} className="shrink-0 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-amber-700 transition-all">
                        View
                    </button>
                </div>
            )}

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <QuickActionButton icon={Calendar} label="Schedule Visit" color="bg-[#0EA5E9]" onClick={() => router.push('/book')} />
                <QuickActionButton icon={MessageSquare} label="Message Doctor" color="bg-indigo-500" onClick={() => setIsMessagingOpen(true)} />
                <QuickActionButton icon={Pill} label="Request Refill" color="bg-emerald-500" onClick={() => router.push('/my-health/medications')} />
            </div>

            {/* DASHBOARD GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* UPCOMING APPOINTMENTS - Left Column */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <DashboardCard title="Upcoming Visits" icon={Calendar}>
                        {appointments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {appointments.map((appt) => {
                                    const apptDate = safeDate(appt.date);
                                    const isPending = (appt.status as any) === 'PENDING_SCHEDULING';
                                    return (
                                        <div key={appt.id} className={`p-5 rounded-2xl border ${isPending ? 'border-amber-100 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-900/10' : 'border-slate-50 bg-[#F8FAFC] dark:border-slate-700/50 dark:bg-slate-800/50'} group hover:border-[#0EA5E9]/30 transition-all relative`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-10 h-10 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center ${isPending ? 'text-amber-500' : 'text-[#0EA5E9]'} group-hover:scale-110 transition-transform`}>
                                                    {isPending ? <Clock className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isPending ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' : 'bg-sky-50 text-[#0EA5E9] border-sky-100'}`}>
                                                    {isPending ? 'AWAITING PROVIDER' : 'SCHEDULED'}
                                                </span>
                                            </div>
                                            <h4 className="font-black text-slate-800 dark:text-slate-100 tracking-tight text-lg mb-1">{appt.providerName}</h4>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{appt.type}</p>

                                            {isPending ? (
                                                <div className="mb-4">
                                                    <p className="text-[10px] font-bold text-amber-700/70 uppercase tracking-widest mb-1">Requested On:</p>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{apptDate ? format(apptDate, 'MMM do, yyyy') : 'Recently'}</span>
                                                        <span className="text-xs font-bold text-slate-400">{apptDate ? format(apptDate, 'h:mm a') : ''}</span>
                                                    </div>
                                                    <div className="bg-amber-50/50 border border-amber-200 text-amber-700 text-[9px] font-black uppercase tracking-widest p-2 rounded-lg flex items-start gap-2">
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        A provider will schedule this within 24 hours
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-[#0EA5E9]" />
                                                        <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                                                            {apptDate ? format(apptDate, 'h:mm a') : 'TBD'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-400">
                                                        {apptDate ? format(apptDate, 'MMM do') : 'Date TBD'}
                                                    </div>
                                                </div>
                                            )}
                                            {isJoinable(appt.date) ? (
                                                <button className="w-full bg-[#0EA5E9] text-white py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-sky-100 hover:scale-[1.02] active:scale-95 transition-all text-xs">
                                                    Join Now
                                                </button>
                                            ) : (
                                                <button onClick={() => router.push('/patient/appointments')} className="w-full bg-white dark:bg-slate-800 text-slate-400 py-3 rounded-xl font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 hover:border-[#0EA5E9] hover:text-[#0EA5E9] transition-all text-xs">
                                                    {isPending ? 'View Details' : 'View Appointment'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : <EmptyState message="No upcoming appointments" />}
                    </DashboardCard>

                    {/* RECENT MESSAGES */}
                    <DashboardCard title="Unread Messages" icon={MessageSquare} footer={<Link href="/patient/messages" className="text-[#0EA5E9] font-black text-xs uppercase tracking-widest hover:underline">View All Messages</Link>}>
                        {messages.length > 0 ? (
                            <div className="space-y-3">
                                {messages.map((msg) => (
                                    <div key={msg.id} className="p-4 rounded-2xl border border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/patient/messages')}>
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                                            {msg.providerName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{msg.providerName}</p>
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{msg.lastMessage}</p>
                                        </div>
                                        <div className="text-[10px] font-black text-slate-300 uppercase shrink-0">
                                            {format(msg.lastMessageAt.toDate(), 'h:mm a')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState message="All caught up! No unread messages." />}
                                        </DashboardCard>

                    {/* REFERRAL CARD */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-white">
                                <Gift className="w-6 h-6" />
                            </div>
                            <h3 className="font-black text-xl tracking-tight mb-2">Give $50, Get $50</h3>
                            <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                                Share the gift of health. Invite friends to Patriotic Telehealth and earn rewards for every signup.
                            </p>
                            <Link href="/patient/referrals" className="inline-flex items-center justify-center w-full bg-white text-indigo-600 font-black tracking-widest uppercase text-xs rounded-xl py-3 hover:bg-slate-50 transition-colors">
                                Get My Link
                            </Link>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-4 space-y-6">
                    {/* MEDICATIONS */}
                    <DashboardCard
                        title="My Medications"
                        icon={Pill}
                        badge={medications.length.toString()}
                        footer={<Link href="/my-health/medications" className="text-[#0EA5E9] font-black text-xs uppercase tracking-widest hover:underline">Manage Prescriptions</Link>}
                    >
                        {medications.length > 0 ? (
                            <div className="space-y-4">
                                {medications.map((med) => (
                                    <div key={med.id} className="flex items-center gap-4 cursor-pointer hover:translate-x-1 transition-transform" onClick={() => router.push('/my-health/medications')}>
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                                            <Pill className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-800 dark:text-slate-100 text-sm truncate">{med.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{med.dosage} • {med.frequency}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState message="No active medications" />}
                    </DashboardCard>

                    {/* LAB RESULTS */}
                    <DashboardCard title="Recent Labs" icon={Activity} footer={<Link href="/my-health/labs" className="text-[#0EA5E9] font-black text-xs uppercase tracking-widest hover:underline">View All Labs</Link>}>
                        {labResults.length > 0 ? (
                            <div className="space-y-6">
                                {labResults.map((lab) => (
                                    <div key={lab.id} className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">{lab.testName}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Released {format(lab.date.toDate(), 'MMM d, yyyy')}</p>
                                            </div>
                                            <StatusBadge status={lab.status} />
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Result Value</span>
                                            <span className="text-lg font-black text-slate-800 dark:text-slate-100">{lab.value}</span>
                                        </div>
                                        <Link href="/my-health/labs" className="block w-full bg-[#F0F9FF] text-[#0EA5E9] py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0EA5E9] hover:text-white transition-all text-center">
                                            View Full Report
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState message="No lab results found" />}
                                        </DashboardCard>

                    {/* REFERRAL CARD */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-white">
                                <Gift className="w-6 h-6" />
                            </div>
                            <h3 className="font-black text-xl tracking-tight mb-2">Give $50, Get $50</h3>
                            <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                                Share the gift of health. Invite friends to Patriotic Telehealth and earn rewards for every signup.
                            </p>
                            <Link href="/patient/referrals" className="inline-flex items-center justify-center w-full bg-white text-indigo-600 font-black tracking-widest uppercase text-xs rounded-xl py-3 hover:bg-slate-50 transition-colors">
                                Get My Link
                            </Link>
                        </div>
                    </div>
                </div>

            </div>

            {/* SEND MESSAGE MODAL */}
            {isMessagingOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                        <div className="bg-[#0EA5E9] p-8 text-white flex justify-between items-center shrink-0 shadow-lg z-10 w-full relative">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                    <MessageSquare className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight leading-none text-white">Message Doctor</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-100 mt-1">Response typically &lt; 24 hrs</p>
                                </div>
                            </div>
                            <button onClick={() => setIsMessagingOpen(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            <form id="dashboard-compose-form" onSubmit={handleSendMessage} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Recipient</label>
                                    <select
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-100"
                                        onChange={(e) => {
                                            const p = providers.find(prov => prov.id === e.target.value);
                                            setComposeData({ ...composeData, recipientId: p?.id || '', recipientName: p?.name || '' });
                                        }}
                                        value={composeData.recipientId}
                                    >
                                        <option value="">Select a doctor...</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subject Line</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-100"
                                            placeholder="e.g. Question about my labs"
                                            value={composeData.subject}
                                            onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-100"
                                            value={composeData.category}
                                            onChange={(e) => setComposeData({ ...composeData, category: e.target.value as any })}
                                        >
                                            {['General', 'Medication', 'Test Results', 'Appointment Request', 'Urgent'].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Message</label>
                                    <textarea
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-3xl p-6 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-100 min-h-[150px] placeholder:text-slate-300"
                                        placeholder="Type your message here..."
                                        value={composeData.body}
                                        onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 shrink-0 flex flex-col sm:flex-row items-center gap-4 justify-between">
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Encrypted & HIPAA-secure</span>
                            </div>
                            <button
                                type="submit"
                                form="dashboard-compose-form"
                                disabled={isSendingMsg || !composeData.recipientId}
                                className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSendingMsg ? 'Sending...' : 'Send Message'} <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Sub-Components ---

function DashboardCard({ title, icon: Icon, children, badge, footer }: any) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-xl shadow-sky-900/5 flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-500">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-400">
                        <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
                    {badge && (
                        <span className="bg-[#0EA5E9] text-white text-[10px] px-1.5 py-0.5 rounded-md font-black">
                            {badge}
                        </span>
                    )}
                </div>
            </div>
            <div className="p-6 flex-1">
                {children}
            </div>
            {footer && (
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-50 dark:border-slate-700/50 text-center">
                    {footer}
                </div>
            )}
        </div>
    );
}

function QuickActionButton({ icon: Icon, label, color, onClick }: any) {
    return (
        <button onClick={onClick} className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all text-left">
            <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight">{label}</span>
        </button>
    );
}

function StatusBadge({ status }: { status: LabResult['status'] }) {
    const styles = {
        'Normal': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'Review Needed': 'bg-amber-50 text-amber-600 border-amber-100',
        'Critical': 'bg-rose-50 text-rose-600 border-rose-100'
    };
    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
            {status}
        </span>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center text-slate-200 mb-2">
                <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-slate-400 font-medium text-xs italic">{message}</p>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse p-4 sm:p-0">
            <div className="space-y-2">
                <div className="h-10 w-64 bg-slate-200 rounded-xl" />
                <div className="h-4 w-48 bg-slate-100 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-20 bg-slate-100 rounded-[24px]" />
                <div className="h-20 bg-slate-100 rounded-[24px]" />
                <div className="h-20 bg-slate-100 rounded-[24px]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 h-96 bg-slate-100 rounded-[32px]" />
                <div className="lg:col-span-4 h-96 bg-slate-100 rounded-[32px]" />
            </div>
        </div>
    );
}
