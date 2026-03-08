"use client";

import React, { useState, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Video, Clock,
    MapPin, X, AlertTriangle, ShieldCheck, User
} from 'lucide-react';
import {
    format, addWeeks, subWeeks, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameDay, isToday, addDays, subDays,
    startOfMonth, endOfMonth, startOfDay, endOfDay, addMonths, subMonths, isWithinInterval,
    isAfter, subMinutes, addMinutes, isBefore
} from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

// --- CONSTANTS ---
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM → 7 PM
const SLOT_HEIGHT = 80; // px per hour

const STATUS_CONFIG: Record<string, { label: string; dot: string; border: string; bg: string }> = {
    scheduled: { label: 'Scheduled', dot: 'bg-sky-500', border: 'border-sky-500', bg: 'bg-sky-50' },
    completed: { label: 'Completed', dot: 'bg-slate-400', border: 'border-slate-400', bg: 'bg-slate-50' },
    cancelled: { label: 'Cancelled', dot: 'bg-rose-500', border: 'border-rose-300', bg: 'bg-rose-50' },
    PENDING_SCHEDULING: { label: 'Awaiting Provider', dot: 'bg-amber-400', border: 'border-amber-400', bg: 'bg-amber-50' },
};

const TELEHEALTH_CONF = { label: 'VIDEO', border: 'border-cyan-500', bg: 'bg-cyan-50/90', text: 'text-cyan-900', badge: 'bg-cyan-100 text-cyan-700' };
const INPERSON_CONF = { label: 'IN-PERSON', border: 'border-emerald-500', bg: 'bg-emerald-50/90', text: 'text-emerald-900', badge: '' };

// --- HELPERS ---

/** Converts any Firestore Timestamp, JS Date, ISO string or epoch number to a plain JS Date */
function resolveDate(v: any): Date | null {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/** Gets the best available appointment date from a normalized appt object */
function getApptDate(appt: any): Date | null {
    // appt.scheduledAt and appt.date are already plain JS Dates after normalization
    return resolveDate(appt.scheduledAt) ?? resolveDate(appt.date) ?? null;
}

function getTypeConf(appt: any) {
    const t = (appt.type || '').toLowerCase();
    return (t === 'in-person') ? INPERSON_CONF : TELEHEALTH_CONF;
}

function getStatusConf(status: string) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING_SCHEDULING;
}

function isJoinActive(appt: any): boolean {
    const apptTime = getApptDate(appt);
    if (!apptTime) return false;
    const now = new Date();
    return isAfter(now, subMinutes(apptTime, 15)) && isBefore(now, addMinutes(apptTime, 60));
}

function normalizeStatus(raw: string): string {
    const s = (raw || '').toLowerCase().trim();
    if (s === 'scheduled') return 'scheduled';
    if (s === 'completed') return 'completed';
    if (s === 'cancelled') return 'cancelled';
    return 'PENDING_SCHEDULING';
}

// --- COMPONENTS ---

function AppointmentCard({ appt, style, onClickCard }: {
    appt: any;
    style: React.CSSProperties;
    onClickCard: (appt: any) => void;
}) {
    const typeConf = getTypeConf(appt);
    const statusConf = getStatusConf(appt.status);
    const apptDate = getApptDate(appt);
    const displayTime = apptDate ? format(apptDate, 'h:mm a') : 'Time TBD';

    return (
        <div
            style={style}
            onClick={() => onClickCard(appt)}
            className={`absolute left-1 right-1 border-l-4 rounded-xl p-2.5 text-xs shadow-sm cursor-pointer hover:shadow-md transition-all z-10 overflow-hidden select-none
                ${typeConf.bg} ${typeConf.border} ${typeConf.text}`}
        >
            <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConf.dot}`} />
                <span className="font-black text-[12px] leading-tight truncate">{appt.providerName || 'Patriotic Provider'}</span>
            </div>
            <div className="text-[10px] font-semibold opacity-60 truncate mb-1.5">
                {(appt.serviceKey || 'Consultation').replace(/_/g, ' ')}
            </div>
            <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold opacity-70">{displayTime}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider ${typeConf.badge}`}>VIDEO</span>
            </div>
        </div>
    );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">{icon}</div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
        </div>
    );
}

function SlideOutPanel({ appt, onClose }: { appt: any | null; onClose: () => void }) {
    if (!appt) return null;
    const typeConf = getTypeConf(appt);
    const statusConf = getStatusConf(appt.status);
    const joinActive = appt.status === 'scheduled' && isJoinActive(appt);
    const apptDate = getApptDate(appt);
    const displayDateTime = apptDate ? format(apptDate, 'h:mm a · MMM d, yyyy') : 'TBD (Awaiting Provider)';
    const meetingUrl = appt.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth';

    return (
        <>
            <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className={`p-6 border-b border-slate-100 ${typeConf.bg} border-l-4 ${typeConf.border}`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`w-2 h-2 rounded-full ${statusConf.dot}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{statusConf.label}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${typeConf.badge}`}>VIDEO</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">{appt.providerName || 'Patriotic Provider'}</h2>
                            <p className="text-sm text-slate-500 font-bold mt-1">
                                {(appt.serviceKey || 'Consultation').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-xl transition-colors text-slate-400 hover:text-slate-800">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-5 border-b border-slate-100">
                        <DetailRow icon={<Clock size={16} />} label="Scheduled For" value={displayDateTime} />
                        <DetailRow icon={<Video size={16} />} label="Visit Type" value={appt.type || 'Telehealth'} />
                        {appt.status !== 'PENDING_SCHEDULING' && (
                            <DetailRow icon={<ShieldCheck size={16} />} label="Status" value={statusConf.label} />
                        )}
                    </div>

                    {appt.status === 'scheduled' && (
                        <div className="p-6 border-b border-slate-100 bg-sky-50/30">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Video Visit Link</p>
                            <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#0EA5E9] hover:underline break-all">
                                {meetingUrl}
                            </a>
                            <p className="text-xs text-slate-500 font-medium mt-3">
                                Please join the waiting room 5–10 minutes prior to your scheduled time.
                            </p>
                        </div>
                    )}

                    {appt.status === 'PENDING_SCHEDULING' && (
                        <div className="p-6">
                            <div className="flex items-start gap-4 p-5 bg-[#FFFBF0] rounded-[24px] border border-amber-100/60">
                                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
                                <div>
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">In Provider Queue</p>
                                    <p className="text-xs font-medium text-amber-700/80 leading-relaxed">A board-certified provider will review your intake and contact you within <strong className="font-bold">24–48 hours</strong> to confirm your appointment time.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100">
                    {appt.status === 'scheduled' && (
                        <a
                            href={meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-xs uppercase tracking-widest font-black transition-all ${joinActive
                                ? 'bg-[#0EA5E9] text-white hover:bg-sky-500 shadow-xl shadow-sky-200 hover:scale-[1.02] active:scale-95'
                                : 'bg-[#0EA5E9] text-white hover:bg-sky-500 shadow-sm'
                                }`}
                        >
                            <Video size={16} />
                            {joinActive ? 'Join Telehealth Visit' : 'Enter Waiting Room'}
                        </a>
                    )}
                    {appt.status === 'PENDING_SCHEDULING' && (
                        <div className="w-full text-center py-4 bg-slate-50 rounded-2xl text-xs uppercase tracking-widest font-black text-slate-400 border border-slate-200">
                            Awaiting Schedule Confirmation
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// --- MAIN PAGE ---
export default function PatientCalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewType, setViewType] = useState<'week' | 'month'>('week');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

    useEffect(() => {
        let unsubConsult: (() => void) | null = null;
        let unsubSubAppt: (() => void) | null = null;
        let unsubTopAppt: (() => void) | null = null;

        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (!user) { setAppointments([]); setLoading(false); return; }

            let consultData: any[] = [];
            let subApptData: any[] = [];

            const STATUS_RANK: Record<string, number> = {
                PENDING_SCHEDULING: 0, waitlist: 0,
                scheduled: 1, completed: 2, cancelled: 3,
            };
            const rankOf = (s: string) => STATUS_RANK[s] ?? 0;

            const merge = () => {
                const byKey = new Map<string, any>();
                consultData.forEach(c => byKey.set(c.id, c));
                subApptData.forEach(a => {
                    const key = a.consultationId || a.id;
                    const existing = byKey.get(key);
                    if (existing) {
                        const betterStatus = rankOf(a.status) >= rankOf(existing.status) ? a.status : existing.status;
                        const betterDate = a.scheduledAt || existing.scheduledAt;
                        byKey.set(key, { ...existing, ...a, status: betterStatus, scheduledAt: betterDate, date: betterDate || a.date || existing.date });
                    } else {
                        byKey.set(key, a);
                    }
                });
                setAppointments(Array.from(byKey.values()));
                setLoading(false);
            };


            const mapConsult = (d: any) => {
                const raw = d.data();
                // scheduledAt is a Firestore Timestamp written by the provider‐schedule endpoint
                const apptDate = resolveDate(raw.scheduledAt) ?? resolveDate(raw.date) ?? null;
                return {
                    id: d.id,
                    consultationId: d.id,
                    status: normalizeStatus(raw.status),
                    providerName: raw.providerName || 'Patriotic Provider',
                    serviceKey: raw.serviceKey || raw.reason || 'Consultation',
                    type: raw.type || 'Telehealth',
                    scheduledAt: apptDate,   // plain JS Date
                    date: apptDate,          // plain JS Date
                    meetingUrl: raw.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth',
                };
            };

            let consultByUid: any[] = [];
            let consultByPatientId: any[] = [];
            const rebuildConsult = () => {
                const byId = new Map<string, any>();
                consultByUid.forEach(a => byId.set(a.id, a));
                consultByPatientId.forEach(a => byId.set(a.id, a));
                consultData = Array.from(byId.values()).filter(a => !a.paymentStatus || a.paymentStatus === 'paid');
                merge();
            };

            unsubConsult = onSnapshot(query(collection(db, 'consultations'), where('uid', '==', user.uid)),
                snap => { consultByUid = snap.docs.map(mapConsult); rebuildConsult(); });

            onSnapshot(query(collection(db, 'consultations'), where('patientId', '==', user.uid)),
                snap => { consultByPatientId = snap.docs.map(mapConsult); rebuildConsult(); });

            unsubSubAppt = onSnapshot(query(collection(db, 'patients', user.uid, 'appointments')),
                snap => {
                    subApptData = snap.docs.map(d => {
                        const raw = d.data();
                        const apptDate = resolveDate(raw.scheduledAt) ?? resolveDate(raw.date) ?? null;
                        return {
                            id: d.id,
                            consultationId: raw.consultationId,
                            status: normalizeStatus(raw.status),
                            providerName: raw.providerName || 'Patriotic Provider',
                            serviceKey: raw.serviceKey || raw.reason || 'Consultation',
                            type: raw.type || 'Telehealth',
                            scheduledAt: apptDate,
                            date: apptDate,
                            meetingUrl: raw.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth',
                        };
                    });
                    merge();
                });

            // Listener 3: top-level appointments (provider-written on scheduling)
            unsubTopAppt = onSnapshot(
                query(collection(db, 'appointments'), where('patientId', '==', user.uid)),
                snap => {
                    const topData = snap.docs.map(d => {
                        const raw = d.data();
                        const apptDate = resolveDate(raw.scheduledAt) ?? resolveDate(raw.startTime) ?? resolveDate(raw.date) ?? null;
                        const consultationId = raw.consultationId || d.id;
                        return {
                            id: d.id,
                            consultationId,
                            status: normalizeStatus(raw.status),
                            providerName: raw.providerName || 'Patriotic Provider',
                            serviceKey: raw.serviceKey || raw.service || raw.type || 'Consultation',
                            type: 'Telehealth',
                            scheduledAt: apptDate,
                            date: apptDate,
                            meetingUrl: raw.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth',
                        };
                    });
                    // Merge top-level appts into subApptData by best status
                    const rankOf = (s: string) => ({ PENDING_SCHEDULING: 0, waitlist: 0, scheduled: 1, completed: 2, cancelled: 3 }[s] ?? 0);
                    const merged = new Map<string, any>();
                    subApptData.forEach(a => merged.set(a.consultationId || a.id, a));
                    topData.forEach(a => {
                        const key = a.consultationId || a.id;
                        const ex = merged.get(key);
                        if (ex) {
                            const betterStatus = rankOf(a.status) >= rankOf(ex.status) ? a.status : ex.status;
                            merged.set(key, { ...ex, ...a, status: betterStatus, scheduledAt: a.scheduledAt || ex.scheduledAt, date: a.scheduledAt || ex.scheduledAt || a.date });
                        } else {
                            merged.set(key, a);
                        }
                    });
                    subApptData = Array.from(merged.values());
                    merge();
                });
        });

        return () => {
            unsubAuth();
            if (unsubConsult) unsubConsult();
            if (unsubSubAppt) unsubSubAppt();
            if (unsubTopAppt) unsubTopAppt();
        };
    }, []);

    // --- VIEW helpers ---
    const getViewRange = () => {
        if (viewType === 'month') return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
        return { start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) };
    };
    const { start: viewStart, end: viewEnd } = getViewRange();
    const viewDays = eachDayOfInterval({ start: viewStart, end: viewEnd });
    const handleNext = () => viewType === 'month' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addWeeks(currentDate, 1));
    const handlePrev = () => viewType === 'month' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(subWeeks(currentDate, 1));

    const getApptStyle = (appt: any): React.CSSProperties => {
        const dt = getApptDate(appt) || new Date();
        const top = ((dt.getHours() - 7) * SLOT_HEIGHT) + ((dt.getMinutes() / 60) * SLOT_HEIGHT);
        return { position: 'absolute', top: `${Math.max(0, top)}px`, height: `${SLOT_HEIGHT}px`, left: 4, right: 4 };
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-100 border-t-[#0EA5E9] rounded-full animate-spin" />
        </div>
    );

    // Only show non-pending appointments that fall within the current view range
    const visibleAppts = appointments.filter(a => {
        if (a.status === 'PENDING_SCHEDULING') return false;
        const d = getApptDate(a);
        if (!d) return false;
        return isWithinInterval(d, { start: startOfDay(viewStart), end: endOfDay(viewEnd) });
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Calendar</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">{format(currentDate, 'MMMM yyyy')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                        <button onClick={() => setViewType('week')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewType === 'week' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Week</button>
                        <button onClick={() => setViewType('month')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewType === 'month' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Month</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrev} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 transition-colors"><ChevronLeft size={18} /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-colors">Today</button>
                        <button onClick={handleNext} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 transition-colors"><ChevronRight size={18} /></button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                {viewType === 'week' && (
                    <div className="flex overflow-x-auto" style={{ minWidth: 640 }}>
                        {/* Time axis */}
                        <div className="w-16 flex-shrink-0 bg-slate-50 border-r border-slate-100 pt-16">
                            {HOURS.map(hour => (
                                <div key={hour} className="relative" style={{ height: SLOT_HEIGHT }}>
                                    <span className="absolute -top-2.5 right-3 text-[10px] font-black text-slate-400 opacity-70">
                                        {format(new Date().setHours(hour, 0), 'h a')}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {/* Day columns */}
                        <div className="flex-1 flex min-w-0">
                            {viewDays.map((day, idx) => {
                                const dayAppts = visibleAppts.filter(a => { const ad = getApptDate(a); return ad && isSameDay(ad, day); });
                                return (
                                    <div key={day.toISOString()} className={`flex-1 min-w-[110px] ${idx < 6 ? 'border-r border-slate-100' : ''}`}>
                                        <div className={`p-3 text-center border-b border-slate-100 h-16 flex flex-col items-center justify-center ${isToday(day) ? 'bg-[#F0F9FF]' : 'bg-white'}`}>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isToday(day) ? 'text-[#0EA5E9]' : 'text-slate-400'}`}>{format(day, 'EEE')}</span>
                                            <span className={`text-lg font-black mt-0.5 ${isToday(day) ? 'text-[#0EA5E9]' : 'text-slate-800'}`}>{format(day, 'd')}</span>
                                        </div>
                                        <div className="relative bg-white" style={{ height: HOURS.length * SLOT_HEIGHT }}>
                                            {HOURS.map(h => (
                                                <div key={h} className="absolute w-full border-t border-slate-50" style={{ top: (h - 7) * SLOT_HEIGHT, height: SLOT_HEIGHT }} />
                                            ))}
                                            {dayAppts.map(appt => (
                                                <AppointmentCard key={appt.id} appt={appt} style={getApptStyle(appt)} onClickCard={setSelectedAppt} />
                                            ))}
                                            {isToday(day) && (
                                                <div className="absolute w-full border-t-2 border-[#0EA5E9] z-20 pointer-events-none"
                                                    style={{ top: ((new Date().getHours() - 7) * SLOT_HEIGHT) + ((new Date().getMinutes() / 60) * SLOT_HEIGHT) }}>
                                                    <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-[#0EA5E9]" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewType === 'month' && (
                    <div style={{ minWidth: 640 }}>
                        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-fr">
                            {viewDays.map(day => {
                                const dayAppts = visibleAppts.filter(a => { const ad = getApptDate(a); return ad && isSameDay(ad, day); });
                                const isCurrentMonth = format(day, 'M') === format(currentDate, 'M');
                                return (
                                    <div key={day.toISOString()} className={`min-h-[120px] p-2 border-r border-b border-slate-100 ${!isCurrentMonth ? 'bg-slate-50/50' : 'bg-white'}`}>
                                        <div className={`text-xs font-black mb-2 text-right ${isToday(day) ? 'text-[#0EA5E9] bg-sky-50 w-6 h-6 rounded-full flex items-center justify-center ml-auto' : 'text-slate-400'}`}>
                                            {format(day, 'd')}
                                        </div>
                                        <div className="space-y-1">
                                            {dayAppts.slice(0, 3).map(appt => {
                                                const tc = getTypeConf(appt);
                                                return (
                                                    <div key={appt.id} onClick={() => setSelectedAppt(appt)}
                                                        className={`text-[9px] font-bold p-1.5 rounded-lg truncate cursor-pointer hover:shadow-md transition-shadow ${tc.bg} ${tc.text} border ${tc.border}`}>
                                                        {getApptDate(appt) ? format(getApptDate(appt)!, 'h:mm a') : 'TBD'} · {appt.providerName || 'Provider'}
                                                    </div>
                                                );
                                            })}
                                            {dayAppts.length > 3 && (
                                                <div className="text-[10px] font-bold text-slate-400 text-center py-1 bg-slate-50 rounded-lg">+{dayAppts.length - 3} more</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {selectedAppt && <SlideOutPanel appt={selectedAppt} onClose={() => setSelectedAppt(null)} />}
        </div>
    );
}
