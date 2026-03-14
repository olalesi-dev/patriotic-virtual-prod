"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Video, Filter, MoreHorizontal, CheckCircle, XCircle, Clock, X, Mail, Phone, User, Activity, ChevronDown, Stethoscope } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, Timestamp, getDoc, getDocs, orderBy, limit } from 'firebase/firestore';
import { TelehealthIframeModal } from '@/components/telehealth/TelehealthIframeModal';

// --- Types ---
interface Appointment {
    id: string;
    patient: string;
    patientEmail: string;
    patientUid: string;
    serviceKey: string;
    time: string;
    displayTime: string;
    displayDate: string;
    type: string;
    status: 'Upcoming' | 'Checked In' | 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'Waitlist';
    intakeAnswers: Record<string, any>;
    createdAt: string;
    meetingUrl?: string;
    raw?: Record<string, any>;
}

interface Message {
    id: string;
    sender: string;
    preview: string;
    time: string;
    unread: boolean;
    patientId?: string;
}

interface WeekData { name: string; visits: number; }

export default function EmrDashboard() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [weekData, setWeekData] = useState<WeekData[]>([
        { name: 'M', visits: 0 }, { name: 'T', visits: 0 }, { name: 'W', visits: 0 },
        { name: 'T', visits: 0 }, { name: 'F', visits: 0 }, { name: 'S', visits: 0 }, { name: 'S', visits: 0 },
    ]);
    const [activeTab, setActiveTab] = useState('Waitlist');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [providerName, setProviderName] = useState('Provider');
    const [providerUid, setProviderUid] = useState('');

    // Review & Schedule modal
    const [reviewAppt, setReviewAppt] = useState<Appointment | null>(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);

    // Detail modal (Upcoming card click)
    const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);

    // Filter
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Telehealth Modal State
    const [activeVideoCall, setActiveVideoCall] = useState<{ url: string, apptId: string, role: 'patient' | 'provider', intakeAnswers: any, patientName: string } | null>(null);

    const scheduleRef = useRef<HTMLDivElement>(null);

    // --- Derived State ---
    const counts = {
        Upcoming: appointments.filter(a => ['Upcoming', 'Checked In', 'Confirmed', 'Pending'].includes(a.status)).length,
        Completed: appointments.filter(a => a.status === 'Completed').length,
        Cancelled: appointments.filter(a => a.status === 'Cancelled').length,
        Waitlist: appointments.filter(a => a.status === 'Waitlist').length,
    };

    const filteredAppointments = appointments.filter(appt => {
        const tabMatch =
            activeTab === 'Upcoming' ? ['Upcoming', 'Checked In', 'Confirmed', 'Pending'].includes(appt.status) :
                activeTab === 'Completed' ? appt.status === 'Completed' :
                    activeTab === 'Cancelled' ? appt.status === 'Cancelled' :
                        appt.status === 'Waitlist';
        const statusMatch = filterStatus === 'all' || appt.status.toLowerCase() === filterStatus;
        return tabMatch && statusMatch;
    });

    // --- Helper: enrich appointment from consultations doc ---
    const enrichFromConsultation = async (apptId: string, data: Record<string, any>) => {
        let ptNameStr = String(data.patient || data.patientName || '').trim();
        if (!ptNameStr || ptNameStr.toLowerCase().includes('unknown') || ptNameStr === 'Patient') {
            ptNameStr = 'Unknown Patient';
        }
        let patientName = ptNameStr;
        let patientEmail = data.patientEmail || '';
        let patientUid = data.patientId || data.uid || '';
        let serviceKey = data.serviceKey || data.service || data.type || 'Consultation';
        let intakeAnswers: Record<string, any> = {};
        let meetingUrl = data.meetingUrl || 'https://doxy.me/patriotictelehealth';

        try {
            const consultSnap = await getDoc(doc(db, 'consultations', apptId));
            if (consultSnap.exists()) {
                const cd = consultSnap.data();
                intakeAnswers = cd.intake || {};
                serviceKey = cd.serviceKey || serviceKey;
                patientUid = cd.uid || cd.patientId || patientUid;
                meetingUrl = cd.meetingUrl || meetingUrl;

                const cdPtName = String(cd.patient || cd.patientName || '').trim();
                if (cdPtName && !cdPtName.toLowerCase().includes('unknown') && cdPtName !== 'Patient') patientName = cdPtName;

                if (cd.intake?.firstName || cd.intake?.lastName) {
                    const iNm = `${cd.intake.firstName || ''} ${cd.intake.lastName || ''}`.trim();
                    if (iNm && !iNm.toLowerCase().includes('unknown') && iNm !== 'Patient') patientName = iNm;
                }
                if (cd.intake?.email) patientEmail = cd.intake.email;
                if (cd.patientEmail) patientEmail = cd.patientEmail;
            }
        } catch (e) { /* silent */ }

        // Lookup patient profile if still unknown
        if (patientUid && patientName === 'Unknown Patient') {
            try {
                const userSnap = await getDoc(doc(db, 'users', patientUid));
                if (userSnap.exists()) {
                    const ud = userSnap.data();
                    const udNm = (ud.displayName || `${ud.firstName || ''} ${ud.lastName || ''}`.trim() || ud.name || '').trim();
                    if (udNm && !udNm.toLowerCase().includes('unknown') && udNm !== 'Patient') patientName = udNm;
                    patientEmail = patientEmail || ud.email || '';
                }
                if (patientName === 'Unknown Patient') {
                    const patSnap = await getDoc(doc(db, 'patients', patientUid));
                    if (patSnap.exists()) {
                        const pd = patSnap.data();
                        const pdNm = (pd.name || pd.displayName || `${pd.firstName || ''} ${pd.lastName || ''}`.trim() || '').trim();
                        if (pdNm && !pdNm.toLowerCase().includes('unknown') && pdNm !== 'Patient') patientName = pdNm;
                        patientEmail = patientEmail || pd.email || '';
                    }
                }
            } catch (e) { /* silent */ }
        }

        if (patientName === 'Unknown Patient' && patientEmail) {
            patientName = patientEmail.split('@')[0]; // Final fallback: use email prefix instead of "Unknown Patient"
        }

        return { patientName, patientEmail, patientUid, serviceKey, intakeAnswers, meetingUrl };
    };

    // --- Data fetch ---
    React.useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) return;
            setProviderUid(user.uid);

            // Get provider name
            try {
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                if (userSnap.exists()) {
                    const ud = userSnap.data();
                    setProviderName(ud.displayName || ud.name || user.displayName || 'Provider');
                } else {
                    setProviderName(user.displayName || 'Provider');
                }
            } catch (e) { setProviderName(user.displayName || 'Provider'); }

            // --- Waitlist appointments (PENDING_SCHEDULING or waitlist) ---
            const bucketUnsub = onSnapshot(
                query(collection(db, 'appointments'), where('status', 'in', ['PENDING_SCHEDULING', 'waitlist'])),
                async (snap) => {
                    const enriched = await Promise.all(snap.docs.map(async (docSnap) => {
                        const data = docSnap.data();
                        const apptId = docSnap.id;
                        let dateObj: Date;
                        if (data.updatedAt?.toDate) dateObj = data.updatedAt.toDate();
                        else if (data.createdAt?.toDate) dateObj = data.createdAt.toDate();
                        else dateObj = new Date();

                        const enriched = await enrichFromConsultation(apptId, data);
                        const svcLabel = enriched.serviceKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

                        return {
                            id: apptId,
                            patient: enriched.patientName,
                            patientEmail: enriched.patientEmail,
                            patientUid: enriched.patientUid,
                            serviceKey: enriched.serviceKey,
                            time: dateObj.toISOString(),
                            displayTime: 'Awaiting',
                            displayDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            type: svcLabel,
                            status: 'Waitlist' as const,
                            intakeAnswers: enriched.intakeAnswers,
                            createdAt: dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
                            meetingUrl: enriched.meetingUrl,
                        };
                    }));

                    setAppointments(prev => {
                        const nonWaitlist = prev.filter(a => a.status !== 'Waitlist');
                        return [...nonWaitlist, ...enriched].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                    });
                }
            );

            // --- Provider scheduled appointments ---
            const provUnsub = onSnapshot(
                query(collection(db, 'appointments'), where('providerId', '==', user.uid)),
                async (snap) => {
                    const enriched = await Promise.all(snap.docs.map(async (docSnap) => {
                        const data = docSnap.data();
                        const apptId = docSnap.id;

                        let dateObj: Date;
                        if (data.startTime?.toDate) dateObj = data.startTime.toDate();
                        else if (data.scheduledAt?.toDate) dateObj = data.scheduledAt.toDate();
                        else if (data.date && data.time) dateObj = new Date(`${data.date}T${data.time}:00`);
                        else if (data.date?.toDate) dateObj = data.date.toDate();
                        else if (typeof data.date === 'string') dateObj = new Date(data.date);
                        else dateObj = new Date();
                        if (isNaN(dateObj.getTime())) dateObj = new Date();

                        let apptStatus = data.status || 'Upcoming';
                        if (apptStatus === 'scheduled') apptStatus = 'Upcoming';
                        if (apptStatus === 'completed') apptStatus = 'Completed';
                        if (apptStatus === 'cancelled') apptStatus = 'Cancelled';
                        if (apptStatus === 'PENDING_SCHEDULING' || apptStatus === 'waitlist') apptStatus = 'Waitlist';

                        if (apptStatus === 'Waitlist') return null; // handled by bucket listener

                        const enrichedData = await enrichFromConsultation(apptId, data);

                        return {
                            id: apptId,
                            patient: data.patientName || enrichedData.patientName,
                            patientEmail: data.patientEmail || enrichedData.patientEmail,
                            patientUid: data.patientId || enrichedData.patientUid,
                            serviceKey: enrichedData.serviceKey,
                            time: dateObj.toISOString(),
                            displayTime: dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                            displayDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            type: data.service || data.type || enrichedData.serviceKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                            status: apptStatus as Appointment['status'],
                            intakeAnswers: enrichedData.intakeAnswers,
                            createdAt: dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
                            meetingUrl: data.meetingUrl || enrichedData.meetingUrl,
                        } as Appointment;
                    }));

                    const valid = enriched.filter(Boolean) as Appointment[];
                    setAppointments(prev => {
                        const waitlist = prev.filter(a => a.status === 'Waitlist');
                        return [...valid, ...waitlist].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                    });

                    // Build weekly volume from this week's scheduled appointments
                    const now = new Date();
                    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday start
                    startOfWeek.setHours(0, 0, 0, 0);

                    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
                    valid.forEach(a => {
                        const d = new Date(a.time);
                        const diff = Math.floor((d.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
                        if (diff >= 0 && diff < 7) dayCounts[diff]++;
                    });
                    setWeekData([
                        { name: 'M', visits: dayCounts[0] }, { name: 'T', visits: dayCounts[1] },
                        { name: 'W', visits: dayCounts[2] }, { name: 'T', visits: dayCounts[3] },
                        { name: 'F', visits: dayCounts[4] }, { name: 'S', visits: dayCounts[5] },
                        { name: 'S', visits: dayCounts[6] },
                    ]);
                }
            );

            // --- Real messages from threads ---
            const msgsUnsub = onSnapshot(
                query(collection(db, 'threads'), where('providerId', '==', user.uid), limit(10)),
                (snap) => {
                    const msgs = snap.docs.map(d => {
                        const data = d.data();
                        const ts = data.lastMessageAt?.toDate ? data.lastMessageAt.toDate() : new Date();
                        const diffMs = Date.now() - ts.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const timeStr = diffMins < 60 ? `${diffMins}m ago` : diffMins < 1440 ? `${Math.floor(diffMins / 60)}h ago` : `${Math.floor(diffMins / 1440)}d ago`;
                        return {
                            id: d.id,
                            sender: data.patientName || 'Patient',
                            preview: data.lastMessage?.text || data.lastMessage || 'New message',
                            time: timeStr,
                            unread: (data.providerUnreadCount || 0) > 0,
                            patientId: data.patientId,
                        } as Message;
                    }).sort((a, b) => (b.unread ? 1 : 0) - (a.unread ? 1 : 0)).slice(0, 4);
                    setMessages(msgs);
                },
                (err) => console.error('Messages listener error:', err)
            );

            return () => {
                bucketUnsub();
                provUnsub();
                msgsUnsub();
            };
        });
        return () => unsubscribe();
    }, []);

    // --- Actions ---
    const handleUpdateStatus = async (id: string, newStatus: Appointment['status']) => {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
        setMenuOpenId(null);
        try {
            const statusMap: Record<string, string> = {
                'Upcoming': 'scheduled', 'Completed': 'completed',
                'Cancelled': 'cancelled', 'Confirmed': 'scheduled', 'Checked In': 'checked_in',
            };
            await updateDoc(doc(db, 'appointments', id), {
                status: statusMap[newStatus] || newStatus.toLowerCase(),
                updatedAt: serverTimestamp()
            });
        } catch (e) { console.error('Failed to update status', e); }
    };

    const handleJoinCall = (appt: Appointment) => {
        let url = appt.meetingUrl || 'https://doxy.me/patriotictelehealth';
        if (url.includes('doxy.me')) url = 'https://doxy.me/sign-in';
        setActiveVideoCall({ url, apptId: appt.id, role: 'provider', intakeAnswers: appt.intakeAnswers, patientName: appt.patient });
    };

    const handleReviewSchedule = (appt: Appointment) => {
        setReviewAppt(appt);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setScheduleDate(tomorrow.toISOString().split('T')[0]);
        setScheduleTime('10:00');
    };

    const handleConfirmSchedule = async () => {
        if (!reviewAppt || !scheduleDate || !scheduleTime) return;
        setIsScheduling(true);
        try {
            const fullDate = new Date(`${scheduleDate}T${scheduleTime}:00`);
            const scheduledAt = Timestamp.fromDate(fullDate);
            const displayTime = fullDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const displayDate = fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const apptRef = doc(db, 'appointments', reviewAppt.id);
            await updateDoc(apptRef, {
                status: 'scheduled',
                date: scheduleDate,
                time: scheduleTime,
                startTime: scheduledAt,
                scheduledAt,
                providerId: auth.currentUser?.uid,
                providerName,
                patientId: reviewAppt.patientUid || reviewAppt.id,
                patientName: reviewAppt.patient,
                type: 'Telehealth',
                service: reviewAppt.type,
                updatedAt: serverTimestamp()
            });

            // Update consultations doc
            try {
                await updateDoc(doc(db, 'consultations', reviewAppt.id), {
                    status: 'scheduled', scheduledAt, providerName,
                    providerId: auth.currentUser?.uid, updatedAt: serverTimestamp()
                });
            } catch (e) { /* may not exist */ }

            // Update patient sub-collection
            if (reviewAppt.patientUid) {
                try {
                    await setDoc(doc(db, 'patients', reviewAppt.patientUid, 'appointments', reviewAppt.id),
                        { status: 'scheduled', scheduledAt, providerName, providerId: auth.currentUser?.uid, updatedAt: serverTimestamp() },
                        { merge: true }
                    );
                } catch (e) { /* silent */ }
            }

            // TRIGGER BACKEND NOTIFICATION
            try {
                const tok = await auth.currentUser?.getIdToken();
                const API = process.env.NEXT_PUBLIC_API_URL || 'https://patriotic-virtual-backend-ckia3at3ra-uc.a.run.app';
                await fetch(`${API}/api/v1/trigger/schedule-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                    body: JSON.stringify({ apptId: reviewAppt.id, scheduledAt: fullDate.toISOString() })
                });
            } catch (e) {
                console.error("Failed to trigger email notification", e);
            }

            setReviewAppt(null);
            setAppointments(prev => prev.map(a =>
                a.id === reviewAppt.id ? { ...a, status: 'Upcoming', displayTime, displayDate } : a
            ));
        } catch (e) {
            console.error('Failed to schedule', e);
            alert('Scheduling failed. Please try again.');
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up pb-10">

            {/* HERO BANNER */}
            <section className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-800/60 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 p-8 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/50 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 mb-2">Welcome back, {providerName}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-lg leading-relaxed">
                        You have <strong className="text-brand">{counts.Upcoming} upcoming</strong> and{' '}
                        <strong className="text-purple-600 dark:text-purple-400">{counts.Waitlist} waiting</strong> for scheduling.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setActiveVideoCall({ url: 'https://doxy.me/sign-in', apptId: '', role: 'provider', intakeAnswers: {}, patientName: 'Waiting Room' })}
                            className="bg-brand hover:bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                            <Video className="w-4 h-4" /> Open Waiting Room
                        </button>
                        <button
                            onClick={() => { setActiveTab('Upcoming'); scheduleRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                            className="bg-white dark:bg-slate-800 dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 dark:text-slate-200 border border-slate-200 dark:border-slate-700 dark:border-slate-600 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors shadow-sm"
                        >
                            View Schedule
                        </button>
                    </div>
                </div>
            </section>

            {/* TABS */}
            <div className="border-b border-slate-200 dark:border-slate-700 dark:border-slate-700">
                <div className="flex gap-8">
                    {(['Waitlist', 'Upcoming', 'Completed', 'Cancelled'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab ? 'border-brand text-brand' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            {tab}
                            {counts[tab] > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{counts[tab]}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT: SCHEDULE LIST */}
                <div className="lg:col-span-2 space-y-4" ref={scheduleRef}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100">
                            {activeTab} Schedule <span className="text-slate-400 font-normal text-sm ml-2">({filteredAppointments.length})</span>
                        </h3>
                        {activeTab === 'Upcoming' && (
                            <div className="relative">
                                <button
                                    onClick={() => setFilterOpen(!filterOpen)}
                                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 hover:text-brand transition-colors bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-700 hover:border-brand/30"
                                >
                                    <Filter className="w-3 h-3" /> Filter
                                    {filterStatus !== 'all' && <span className="w-1.5 h-1.5 bg-brand rounded-full" />}
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                                {filterOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 z-50 overflow-hidden">
                                        <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by status</div>
                                        {['all', 'upcoming', 'checked in', 'confirmed', 'pending'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => { setFilterStatus(s); setFilterOpen(false); }}
                                                className={`w-full text-left px-4 py-2 text-xs font-medium capitalize hover:bg-slate-50 dark:hover:bg-slate-700 ${filterStatus === s ? 'text-brand font-bold bg-brand-50 dark:bg-brand/10' : 'text-slate-700 dark:text-slate-300'}`}
                                            >
                                                {s === 'all' ? 'All Upcoming' : s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 min-h-[300px]">
                        {filteredAppointments.length === 0 ? (
                            <div className="text-center py-12 border border-slate-100 dark:border-slate-700 dark:border-slate-700 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                                <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No {activeTab.toLowerCase()} appointments.</p>
                            </div>
                        ) : (
                            filteredAppointments.map(appt => (
                                <ScheduleCard
                                    key={appt.id}
                                    appointment={appt}
                                    isMenuOpen={menuOpenId === appt.id}
                                    onToggleMenu={() => setMenuOpenId(menuOpenId === appt.id ? null : appt.id)}
                                    onStatusChange={handleUpdateStatus}
                                    onJoin={() => handleJoinCall(appt)}
                                    onReviewSchedule={() => handleReviewSchedule(appt)}
                                    onViewDetail={() => setDetailAppt(appt)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT: STATS & INBOX */}
                <div className="space-y-6">
                    {/* Chart Widget */}
                    <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 text-sm">Weekly Volume</h3>
                            <span className="text-xs text-brand font-medium bg-brand-50 dark:bg-brand/10 px-2 py-1 rounded-full flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {counts.Upcoming + counts.Completed} this week
                            </span>
                        </div>
                        <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weekData}>
                                    <defs>
                                        <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip
                                        cursor={{ stroke: '#e2e8f0' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                                    />
                                    <Area type="monotone" dataKey="visits" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorBrand)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Inbox Widget */}
                    <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 text-sm">
                                Recent Messages <span className="text-slate-400 font-normal">({messages.filter(m => m.unread).length})</span>
                            </h3>
                            <Link href="/inbox" className="text-xs font-semibold text-brand hover:underline">View All</Link>
                        </div>
                        <div>
                            {messages.length > 0 ? messages.map(msg => (
                                <Link href="/inbox" key={msg.id} className={`block p-4 border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-start gap-3 group transition-colors ${msg.unread ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}>
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                                        {msg.sender.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className={`text-sm truncate ${msg.unread ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>{msg.sender}</h4>
                                            <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">{msg.time}</span>
                                        </div>
                                        <p className={`text-xs truncate ${msg.unread ? 'text-slate-600 dark:text-slate-400 font-medium' : 'text-slate-500 dark:text-slate-500'}`}>{msg.preview}</p>
                                    </div>
                                    {msg.unread && <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />}
                                </Link>
                            )) : (
                                <div className="p-8 text-center text-slate-400 text-sm italic">No messages yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* REVIEW & SCHEDULE MODAL */}
            {reviewAppt && (
                <ModalOverlay onClose={() => setReviewAppt(null)}>
                    <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 dark:border-slate-700 flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-900/20">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100">Review &amp; Schedule</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Intake for <strong>{reviewAppt.patient}</strong></p>
                            </div>
                            <button onClick={() => setReviewAppt(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8">
                            {/* Patient Info */}
                            <PatientInfoSection appt={reviewAppt} />

                            {/* Intake Q&A */}
                            <IntakeSection intakeAnswers={reviewAppt.intakeAnswers} />

                            {/* Set Time */}
                            <section className="bg-indigo-50/20 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
                                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">Set Appointment Time</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Date</label>
                                        <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 dark:border-slate-600 text-slate-800 dark:text-slate-100 dark:text-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand/20 outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Time</label>
                                        <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 dark:border-slate-600 text-slate-800 dark:text-slate-100 dark:text-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand/20 outline-none" />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setReviewAppt(null)} className="px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleConfirmSchedule} disabled={isScheduling}
                                className="bg-brand text-white px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-brand/20 hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center gap-2">
                                {isScheduling ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                {isScheduling ? 'Scheduling...' : 'Finalize & Schedule'}
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {/* DETAIL MODAL (Upcoming card click) */}
            {detailAppt && (
                <ModalOverlay onClose={() => setDetailAppt(null)}>
                    <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100">Appointment Details</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">{detailAppt.displayDate} at {detailAppt.displayTime}</p>
                            </div>
                            <button onClick={() => setDetailAppt(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-8">
                            <PatientInfoSection appt={detailAppt} />
                            <IntakeSection intakeAnswers={detailAppt.intakeAnswers} />
                            {detailAppt.meetingUrl && (
                                <button
                                    onClick={() => {
                                        let url = detailAppt.meetingUrl || '';
                                        if (url.includes('doxy.me')) url = 'https://doxy.me/sign-in';
                                        setActiveVideoCall({ url, apptId: detailAppt.id, role: 'provider', intakeAnswers: detailAppt.intakeAnswers, patientName: detailAppt.patient });
                                    }}
                                    className="w-full bg-brand text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-600 transition-all shadow-md"
                                >
                                    <Video className="w-4 h-4" /> Join Telehealth Session
                                </button>
                            )}
                        </div>
                    </div>
                </ModalOverlay>
            )}

            <TelehealthIframeModal 
                isOpen={!!activeVideoCall} 
                onClose={() => setActiveVideoCall(null)} 
                role={activeVideoCall?.role as any} 
                videoLink={activeVideoCall?.url || ''} 
                appointmentId={activeVideoCall?.apptId} 
                patientName={activeVideoCall?.patientName}
                intakeAnswers={activeVideoCall?.intakeAnswers} 
            />
        </div>
    );
}

// --- Sub-Components ---

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="animate-in zoom-in duration-200">{children}</div>
        </div>
    );
}

function PatientInfoSection({ appt }: { appt: Appointment }) {
    return (
        <section className="bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Patient Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                    { icon: User, label: 'Patient Name', value: appt.patient },
                    { icon: Mail, label: 'Email', value: appt.patientEmail || 'Not provided' },
                    { icon: Calendar, label: 'Service Requested', value: appt.type },
                    { icon: Clock, label: 'Submitted', value: appt.createdAt },
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-white dark:bg-slate-800 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 flex items-start gap-3">
                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-brand" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100">{value || '—'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function IntakeSection({ intakeAnswers }: { intakeAnswers: Record<string, any> }) {
    const entries = Object.entries(intakeAnswers || {});
    return (
        <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-50 dark:border-slate-700 pb-2">Patient Intake Q&amp;A</h3>
            {entries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {entries.map(([k, v]) => (
                        <div key={k} className="bg-white dark:bg-slate-800 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                {k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                            </p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 dark:text-slate-100">
                                {typeof v === 'boolean' ? (v ? '✅ Yes' : '❌ No') : String(v)}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-slate-400 italic">No detailed intake provided.</p>
            )}
        </section>
    );
}

function ScheduleCard({ appointment, isMenuOpen, onToggleMenu, onStatusChange, onJoin, onReviewSchedule, onViewDetail }: any) {
    const { displayTime, displayDate, patient, type, status } = appointment;
    const isActionable = ['Upcoming', 'Checked In', 'Confirmed'].includes(status);

    const statusColors: Record<string, string> = {
        'Upcoming': 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-600',
        'Checked In': 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
        'Confirmed': 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800',
        'Pending': 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800',
        'Completed': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
        'Cancelled': 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800',
        'Waitlist': 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800',
    };

    const getServiceIcon = (key: string) => {
        if (!key) return Stethoscope;
        const k = key.toLowerCase();
        if (k.includes('weight') || k.includes('hrt') || k.includes('testosterone') || k.includes('vital')) return Activity;
        if (k.includes('erectile') || k.includes('premature') || k.includes('mens')) return Activity;
        return Stethoscope; // Fallback
    };
    const ServiceIcon = getServiceIcon(appointment.serviceKey);

    return (
        <div
            onClick={status !== 'Waitlist' ? onViewDetail : undefined}
            className={`bg-white dark:bg-slate-800 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between group relative ${status !== 'Waitlist' ? 'cursor-pointer hover:border-brand/30 dark:hover:border-brand/40' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-700 dark:border-slate-600 text-slate-600 dark:text-slate-300 dark:text-slate-300 font-mono group-hover:bg-brand-50 dark:group-hover:bg-brand/10 group-hover:text-brand transition-colors shrink-0">
                    {status === 'Waitlist' ? (
                        <>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter leading-tight" title="Submitted Date">{appointment.createdAt ? appointment.createdAt.split(',')[0] : 'Wait'}</span>
                            <span className="text-[10px] font-bold leading-tight mt-0.5" title="Submitted Time">{appointment.createdAt ? (appointment.createdAt.split(',')[2]?.trim() || appointment.createdAt.split(',')[1]?.trim() || appointment.displayTime) : ''}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-[10px] font-bold uppercase">{displayTime.split(' ')[1] || ''}</span>
                            <span className="text-base font-bold leading-tight">{displayTime.split(' ')[0]}</span>
                            <span className="text-[9px] text-slate-400">{displayDate}</span>
                        </>
                    )}
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white dark:text-slate-100 text-sm group-hover:text-brand transition-colors">{patient}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                        <ServiceIcon className="w-3.5 h-3.5 text-brand" />
                        {type}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusColors[status] || 'bg-slate-50 dark:bg-slate-700'}`}>{status}</span>

                {status === 'Waitlist' && (
                    <button onClick={e => { e.stopPropagation(); onReviewSchedule(); }}
                        className="bg-brand text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-brand-600 transition-colors shadow-sm active:scale-95 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Review &amp; Schedule
                    </button>
                )}

                {isActionable && (
                    <button onClick={e => { e.stopPropagation(); onJoin(); }}
                        className="bg-brand text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-brand-600 transition-colors shadow-sm active:scale-95 flex items-center gap-1">
                        <Video className="w-3 h-3" /> Join
                    </button>
                )}

                <div className="relative">
                    <button onClick={e => { e.stopPropagation(); onToggleMenu(); }}
                        className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isMenuOpen ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <div className="py-1">
                                <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Update Status</div>
                                {['Checked In', 'Completed', 'Cancelled', 'Upcoming'].map(s => (
                                    <button key={s} onClick={e => { e.stopPropagation(); onStatusChange(appointment.id, s); }}
                                        className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${s === status ? 'text-brand font-bold bg-brand-50 dark:bg-brand/10' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {s === 'Checked In' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                        {s === 'Completed' && <CheckCircle className="w-3 h-3 text-indigo-500" />}
                                        {s === 'Cancelled' && <XCircle className="w-3 h-3 text-red-500" />}
                                        {s === 'Upcoming' && <Clock className="w-3 h-3 text-slate-500" />}
                                        Mark as {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
