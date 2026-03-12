"use client";

import React, { useState, useEffect } from 'react';
import {
    Video, Clock, Calendar, ChevronRight, ExternalLink,
    User, Stethoscope, Phone, CheckCircle2, X, Info,
    CalendarCheck, Wifi, ArrowRight, AlertCircle
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
    collection, query, where, onSnapshot,
    Timestamp
} from 'firebase/firestore';
import { format, isAfter, isBefore, addMinutes, subMinutes, formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'react-hot-toast';
import { TelehealthIframeModal } from '@/components/telehealth/TelehealthIframeModal';

/* ─── helpers ──────────────────────────────────────────────── */
function toDate(v: any): Date | null {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate();
    if (v instanceof Date) return v;
    if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

const STATUS_RANK: Record<string, number> = {
    PENDING_SCHEDULING: 0, waitlist: 0,
    scheduled: 1, completed: 2, cancelled: 3,
};

function rankOf(s: string) { return STATUS_RANK[s] ?? 0; }

function normalizeStatus(raw: string): string {
    const s = (raw || '').toLowerCase().trim();
    if (s === 'scheduled') return 'scheduled';
    if (s === 'completed') return 'completed';
    if (s === 'cancelled') return 'cancelled';
    return 'PENDING_SCHEDULING';
}

/* ─── types ─────────────────────────────────────────────────── */
interface Appt {
    id: string;
    consultationId: string;
    status: string;
    scheduledAt: Date | null;
    providerName: string;
    serviceKey: string;
    type: string;
    meetingUrl: string;
    patientName?: string;
    patientEmail?: string;
    intakeAnswers?: Record<string, any>;
}

/* ─── component ─────────────────────────────────────────────── */
export default function ScheduledAppointmentsPage() {
    const [appointments, setAppointments] = useState<Appt[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Appt | null>(null);

    // Telehealth Modal State
    const [activeVideoCall, setActiveVideoCall] = useState<{ url: string, apptId: string, role: 'patient' | 'provider', intakeAnswers: any } | null>(null);

    useEffect(() => {
        let unsubs: Array<() => void> = [];

        const unsubAuth = auth.onAuthStateChanged(user => {
            unsubs.forEach(u => u());
            unsubs = [];

            if (!user) { setAppointments([]); setLoading(false); return; }

            let consultData: Appt[] = [];
            let subData: Appt[] = [];
            let topData: Appt[] = [];

            const mergeAll = () => {
                const map = new Map<string, Appt>();
                // Layer 1: consultations
                consultData.forEach(a => map.set(a.id, a));
                // Layer 2: sub-collection
                [...subData, ...topData].forEach(a => {
                    const key = a.consultationId || a.id;
                    const ex = map.get(key);
                    if (ex) {
                        const betterStatus = rankOf(a.status) >= rankOf(ex.status) ? a.status : ex.status;
                        const betterDate = a.scheduledAt || ex.scheduledAt;
                        map.set(key, { ...ex, ...a, status: betterStatus, scheduledAt: betterDate });
                    } else {
                        map.set(key, a);
                    }
                });
                // Only keep scheduled
                const result = Array.from(map.values())
                    .filter(a => a.status === 'scheduled')
                    .sort((a, b) => (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0));
                setAppointments(result);
                setLoading(false);
            };

            const mapConsult = (d: any): Appt => {
                const raw = d.data();
                const scheduledAt = toDate(raw.scheduledAt);
                return {
                    id: d.id,
                    consultationId: d.id,
                    status: normalizeStatus(raw.status),
                    scheduledAt,
                    providerName: raw.providerName || 'Patriotic Provider',
                    serviceKey: raw.serviceKey || 'Consultation',
                    type: 'Telehealth',
                    meetingUrl: raw.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth',
                    intakeAnswers: raw.intake || {},
                    patientName: raw.intake ? `${raw.intake.firstName || ''} ${raw.intake.lastName || ''}`.trim() : '',
                    patientEmail: raw.intake?.email || '',
                };
            };

            // Listener 1a: consultations by uid
            const u1 = onSnapshot(
                query(collection(db, 'consultations'), where('uid', '==', user.uid)),
                snap => { consultData = snap.docs.map(mapConsult); mergeAll(); }
            );
            unsubs.push(u1);

            // Listener 1b: consultations by patientId (legacy)
            const u2 = onSnapshot(
                query(collection(db, 'consultations'), where('patientId', '==', user.uid)),
                snap => {
                    const extra = snap.docs.map(mapConsult);
                    extra.forEach(a => {
                        if (!consultData.find(c => c.id === a.id)) consultData.push(a);
                    });
                    mergeAll();
                }
            );
            unsubs.push(u2);

            // Listener 2: patients/{uid}/appointments sub-collection
            const u3 = onSnapshot(
                query(collection(db, 'patients', user.uid, 'appointments')),
                snap => {
                    subData = snap.docs.map(d => {
                        const raw = d.data();
                        const scheduledAt = toDate(raw.scheduledAt) ?? toDate(raw.date);
                        return {
                            id: d.id,
                            consultationId: raw.consultationId || d.id,
                            status: normalizeStatus(raw.status),
                            scheduledAt,
                            providerName: raw.providerName || 'Patriotic Provider',
                            serviceKey: raw.serviceKey || 'Consultation',
                            type: 'Telehealth',
                            meetingUrl: raw.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth',
                            intakeAnswers: raw.intakeAnswers || {},
                        };
                    });
                    mergeAll();
                }
            );
            unsubs.push(u3);

            // Listener 3: top-level appointments collection (provider-written)
            const u4 = onSnapshot(
                query(collection(db, 'appointments'), where('patientId', '==', user.uid)),
                snap => {
                    topData = snap.docs.map(d => {
                        const raw = d.data();
                        const scheduledAt = toDate(raw.scheduledAt) ?? toDate(raw.startTime) ?? toDate(raw.date);
                        return {
                            id: d.id,
                            consultationId: raw.consultationId || d.id,
                            status: normalizeStatus(raw.status),
                            scheduledAt,
                            providerName: raw.providerName || 'Patriotic Provider',
                            serviceKey: raw.serviceKey || raw.service || raw.type || 'Consultation',
                            type: 'Telehealth',
                            meetingUrl: raw.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth',
                            intakeAnswers: raw.intakeAnswers || raw.intake || {},
                            patientName: raw.patientName || '',
                            patientEmail: raw.patientEmail || '',
                        };
                    });
                    mergeAll();
                }
            );
            unsubs.push(u4);
        });

        return () => {
            unsubAuth();
            unsubs.forEach(u => u());
        };
    }, []);

    const isJoinable = (d: Date | null) => {
        if (!d) return false;
        const now = new Date();
        return isAfter(now, subMinutes(d, 15)) && isBefore(now, addMinutes(d, 90));
    };

    const fmtService = (key: string) =>
        key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    /* ── upcoming vs past split ── */
    const now = new Date();
    const upcoming = appointments.filter(a => !a.scheduledAt || isAfter(a.scheduledAt, subMinutes(now, 90)));
    const past = appointments.filter(a => a.scheduledAt && isBefore(a.scheduledAt, subMinutes(now, 90)));

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-24">

            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0EA5E9] via-[#0284C7] to-[#075985] p-8 md:p-10 text-white shadow-2xl shadow-sky-200">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                <CalendarCheck className="w-5 h-5" />
                            </div>
                            <span className="text-sky-200 font-black uppercase tracking-widest text-[10px]">Confirmed Appointments</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
                            Your Schedule
                        </h1>
                        <p className="mt-2 text-sky-100 text-sm font-medium max-w-md">
                            All your confirmed telehealth appointments in one place. Join your visit up to 15 minutes early.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20 min-w-[80px]">
                            <div className="text-3xl font-black">{upcoming.length}</div>
                            <div className="text-sky-200 text-[10px] font-black uppercase tracking-widest mt-1">Upcoming</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20 min-w-[80px]">
                            <div className="text-3xl font-black">{past.length}</div>
                            <div className="text-sky-200 text-[10px] font-black uppercase tracking-widest mt-1">Completed</div>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-sky-100 border-t-[#0EA5E9] rounded-full animate-spin" />
                </div>
            ) : appointments.length === 0 ? (
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-16 text-center space-y-4">
                    <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center mx-auto">
                        <CalendarCheck className="w-10 h-10 text-sky-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">No scheduled appointments yet</h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto">When your care team confirms an appointment, it will appear here with a link to join your telehealth visit.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* ─── UPCOMING ─── */}
                    {upcoming.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-pulse" />
                                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Upcoming ({upcoming.length})</h2>
                            </div>
                            {upcoming.map(appt => (
                                <AppointmentCard
                                    key={appt.id}
                                    appt={appt}
                                    isJoinable={isJoinable(appt.scheduledAt)}
                                    fmtService={fmtService}
                                    onClick={() => setSelected(appt)}
                                    onJoin={() => setActiveVideoCall({ url: appt.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth', apptId: appt.id, role: 'patient', intakeAnswers: appt.intakeAnswers })}
                                />
                            ))}
                        </section>
                    )}

                    {/* ─── PAST ─── */}
                    {past.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Past Visits ({past.length})</h2>
                            </div>
                            {past.map(appt => (
                                <AppointmentCard
                                    key={appt.id}
                                    appt={appt}
                                    isJoinable={false}
                                    fmtService={fmtService}
                                    onClick={() => setSelected(appt)}
                                    onJoin={() => {}}
                                    dim
                                />
                            ))}
                        </section>
                    )}
                </div>
            )}

            {/* ── Detail Slide-over ── */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="bg-white w-full md:max-w-lg rounded-t-[40px] md:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-8 duration-400 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Panel header */}
                        <div className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] p-6 text-white flex items-start justify-between">
                            <div>
                                <p className="text-sky-200 text-[10px] font-black uppercase tracking-widest mb-1">Appointment Details</p>
                                <h2 className="text-xl font-black">{fmtService(selected.serviceKey)}</h2>
                            </div>
                            <button onClick={() => setSelected(null)} className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Date/time */}
                            <InfoRow icon={<Clock className="w-4 h-4 text-[#0EA5E9]" />} label="Date & Time">
                                {selected.scheduledAt
                                    ? format(selected.scheduledAt, "EEEE, MMMM d, yyyy · h:mm a")
                                    : 'TBD'}
                            </InfoRow>

                            {/* Provider */}
                            <InfoRow icon={<User className="w-4 h-4 text-[#0EA5E9]" />} label="Provider">
                                {selected.providerName}
                            </InfoRow>

                            {/* Visit type */}
                            <InfoRow icon={<Stethoscope className="w-4 h-4 text-[#0EA5E9]" />} label="Service">
                                {fmtService(selected.serviceKey)}
                            </InfoRow>

                            {/* Status */}
                            <InfoRow icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Status">
                                <span className="text-emerald-600 font-black">Confirmed</span>
                            </InfoRow>

                            {/* Join tip */}
                            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex gap-3">
                                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                                <p className="text-sky-700 text-xs font-semibold leading-relaxed">
                                    The "Join Visit" button activates 15 minutes before your appointment. Make sure your camera and microphone are ready.
                                </p>
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => {
                                    if (selected.scheduledAt && !isJoinable(selected.scheduledAt)) {
                                        toast('Your visit link will be active 15 minutes before the appointment.');
                                        return;
                                    }
                                    setActiveVideoCall({
                                        url: selected.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth',
                                        apptId: selected.id,
                                        role: 'patient',
                                        intakeAnswers: selected.intakeAnswers
                                    });
                                }}
                                className="flex items-center justify-center gap-3 w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-sky-100"
                            >
                                <Video className="w-5 h-5" />
                                Join Telehealth Visit
                                <ExternalLink className="w-4 h-4 opacity-70" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <TelehealthIframeModal 
                isOpen={!!activeVideoCall} 
                onClose={() => setActiveVideoCall(null)} 
                role={activeVideoCall?.role as any} 
                videoLink={activeVideoCall?.url || ''} 
                appointmentId={activeVideoCall?.apptId} 
                intakeAnswers={activeVideoCall?.intakeAnswers} 
            />
        </div>
    );
}

/* ─── Sub-components ──────────────────────────────────────────── */
function AppointmentCard({ appt, isJoinable, fmtService, onClick, onJoin, dim = false }: {
    appt: Appt;
    isJoinable: boolean;
    fmtService: (k: string) => string;
    onClick: () => void;
    onJoin: () => void;
    dim?: boolean;
}) {
    const d = appt.scheduledAt;
    const isPastAppt = d ? isPast(addMinutes(d, 90)) : false;

    return (
        <div
            className={`group bg-white rounded-[28px] border transition-all cursor-pointer hover:shadow-xl hover:shadow-sky-900/5 active:scale-[0.99]
                ${isJoinable
                    ? 'border-[#0EA5E9]/30 shadow-md shadow-sky-100 ring-2 ring-[#0EA5E9]/20'
                    : dim
                        ? 'border-slate-100 opacity-75 hover:opacity-100'
                        : 'border-slate-100 shadow-sm'
                }`}
            onClick={onClick}
        >
            <div className="p-5 md:p-6 flex flex-col md:flex-row gap-5 items-start md:items-center">
                {/* Date badge */}
                <div className={`w-[76px] h-[76px] rounded-[20px] flex flex-col items-center justify-center shrink-0
                    ${isJoinable ? 'bg-[#0EA5E9] text-white' : isPastAppt ? 'bg-slate-100' : 'bg-sky-50'}`}>
                    {d ? (
                        <>
                            <span className={`text-[10px] font-black uppercase tracking-widest
                                ${isJoinable ? 'text-sky-100' : isPastAppt ? 'text-slate-400' : 'text-[#0EA5E9]'}`}>
                                {format(d, 'MMM')}
                            </span>
                            <span className={`text-3xl font-black leading-none
                                ${isJoinable ? 'text-white' : isPastAppt ? 'text-slate-500' : 'text-slate-800'}`}>
                                {format(d, 'd')}
                            </span>
                            <span className={`text-[10px] font-bold mt-0.5
                                ${isJoinable ? 'text-sky-100' : isPastAppt ? 'text-slate-400' : 'text-slate-500'}`}>
                                {format(d, 'yyyy')}
                            </span>
                        </>
                    ) : (
                        <span className="text-[10px] font-black text-slate-400 uppercase">TBD</span>
                    )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-800 truncate">{appt.providerName}</h3>
                        {isJoinable && (
                            <span className="inline-flex items-center gap-1 bg-[#0EA5E9] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg animate-pulse">
                                <Wifi className="w-2.5 h-2.5" /> LIVE NOW
                            </span>
                        )}
                        {isPastAppt && (
                            <span className="bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                                Completed
                            </span>
                        )}
                        {!isJoinable && !isPastAppt && (
                            <span className="bg-sky-50 text-[#0EA5E9] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-sky-100">
                                Scheduled
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {d && (
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {format(d, 'h:mm a')}
                                {!isPastAppt && d && (
                                    <span className="text-slate-300 normal-case font-medium tracking-normal">
                                        · {formatDistanceToNow(d, { addSuffix: true })}
                                    </span>
                                )}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <Video className="w-3 h-3" />
                            Telehealth
                        </span>
                    </div>

                    <p className="text-slate-400 text-sm italic truncate">{fmtService(appt.serviceKey)}</p>
                </div>

                {/* Action */}
                <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto">
                    {isJoinable ? (
                        <button
                            onClick={e => { e.stopPropagation(); onJoin(); }}
                            className="flex items-center justify-center gap-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-sky-200 hover:scale-105"
                        >
                            <Video className="w-4 h-4" /> Join Now
                        </button>
                    ) : (
                        <button
                            onClick={e => { e.stopPropagation(); onClick(); }}
                            className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-sky-50 text-slate-500 hover:text-[#0EA5E9] border border-slate-100 hover:border-sky-100 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                        >
                            Details <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">{icon}</div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                <p className="text-slate-800 font-bold text-sm">{children}</p>
            </div>
        </div>
    );
}
