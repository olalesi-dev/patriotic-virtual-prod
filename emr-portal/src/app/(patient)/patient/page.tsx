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
    History
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    limit,
    onSnapshot,
    Timestamp,
} from 'firebase/firestore';
import { format, isSameDay, isAfter, subMinutes, addMinutes } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function PatientDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Data States
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [labResults, setLabResults] = useState<LabResult[]>([]);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setupRealtimeListeners(currentUser.uid);
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
                .filter(a => a.status !== 'cancelled' && a.status !== 'completed')
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
                        // Only show paid consultations
                        if (raw.paymentStatus && raw.paymentStatus !== 'paid') return null;
                        return {
                            id: d.id,
                            providerName: raw.providerName || 'Patriotic Provider',
                            type: 'Telehealth',
                            status: raw.status === 'waitlist' ? 'PENDING_SCHEDULING' :
                                raw.status === 'scheduled' ? 'scheduled' : 'PENDING_SCHEDULING',
                            // Use scheduledAt if available, fall back to createdAt
                            date: raw.scheduledAt || raw.createdAt,
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
                    return {
                        id: d.id,
                        consultationId: raw.consultationId,
                        providerName: raw.providerName || 'Patriotic Provider',
                        type: raw.type || 'Telehealth',
                        status: raw.status === 'waitlist' ? 'PENDING_SCHEDULING' : (raw.status || 'PENDING_SCHEDULING'),
                        date: raw.scheduledAt || raw.createdAt || raw.date,
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

    const isJoinable = (apptDate: any) => {
        const date = safeDate(apptDate);
        if (!date) return false;
        const now = new Date();
        return isAfter(now, subMinutes(date, 15)) && !isAfter(now, addMinutes(date, 60));
    };

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-0">
            {/* WELCOME BANNER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                        Healthy morning, <span className="text-[#0EA5E9]">{user?.displayName?.split(' ')[0] || 'Patient'}</span>
                    </h1>
                    <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-xs flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> {format(new Date(), 'EEEE, MMMM do, yyyy')}
                    </p>
                </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <QuickActionButton icon={Calendar} label="Schedule Visit" color="bg-[#0EA5E9]" onClick={() => router.push('/patient/appointments')} />
                <QuickActionButton icon={MessageSquare} label="Message Doctor" color="bg-indigo-500" onClick={() => router.push('/patient/messages')} />
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
                                        <div key={appt.id} className="p-5 rounded-2xl border border-slate-50 bg-[#F8FAFC] group hover:border-[#0EA5E9]/30 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#0EA5E9] group-hover:scale-110 transition-transform">
                                                    <History className="w-5 h-5" />
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isPending ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-sky-50 text-[#0EA5E9] border-sky-100'
                                                    }`}>
                                                    {isPending ? 'Awaiting Provider' : appt.status}
                                                </span>
                                            </div>
                                            <h4 className="font-black text-slate-800 tracking-tight text-lg mb-1">{appt.providerName}</h4>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{appt.type}</p>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-[#0EA5E9]" />
                                                    <span className="text-xs font-black text-slate-600">
                                                        {apptDate ? format(apptDate, 'h:mm a') : 'TBD'}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-slate-400">
                                                    {apptDate ? format(apptDate, 'MMM do') : 'Date TBD'}
                                                </div>
                                            </div>
                                            {isJoinable(appt.date) ? (
                                                <button className="w-full bg-[#0EA5E9] text-white py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-sky-100 hover:scale-[1.02] active:scale-95 transition-all text-xs">
                                                    Join Now
                                                </button>
                                            ) : (
                                                <button onClick={() => router.push('/patient/appointments')} className="w-full bg-white text-slate-400 py-3 rounded-xl font-black uppercase tracking-widest border border-slate-100 hover:border-[#0EA5E9] hover:text-[#0EA5E9] transition-all text-xs">
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
                                    <div key={msg.id} className="p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/patient/messages')}>
                                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 shrink-0">
                                            {msg.providerName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{msg.providerName}</p>
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
                                            <p className="font-black text-slate-800 text-sm truncate">{med.name}</p>
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
                                                <h4 className="font-black text-slate-800 tracking-tight leading-tight">{lab.testName}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Released {format(lab.date.toDate(), 'MMM d, yyyy')}</p>
                                            </div>
                                            <StatusBadge status={lab.status} />
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Result Value</span>
                                            <span className="text-lg font-black text-slate-800">{lab.value}</span>
                                        </div>
                                        <Link href="/my-health/labs" className="block w-full bg-[#F0F9FF] text-[#0EA5E9] py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0EA5E9] hover:text-white transition-all text-center">
                                            View Full Report
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState message="No lab results found" />}
                    </DashboardCard>
                </div>

            </div>
        </div>
    );
}

// --- Sub-Components ---

function DashboardCard({ title, icon: Icon, children, badge, footer }: any) {
    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-sky-900/5 flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-500">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                        <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-800 tracking-tight">{title}</h3>
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
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 text-center">
                    {footer}
                </div>
            )}
        </div>
    );
}

function QuickActionButton({ icon: Icon, label, color }: any) {
    return (
        <button className="flex items-center gap-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all text-left">
            <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-800 text-sm tracking-tight">{label}</span>
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
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-2">
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
