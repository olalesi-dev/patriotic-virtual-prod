"use client";

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import {
    collection, query, where, onSnapshot, getDoc, doc,
    updateDoc, setDoc, Timestamp, serverTimestamp
} from 'firebase/firestore';
import {
    Search, Filter, Clock, Video, FileText, AlertCircle, CheckCircle,
    Stethoscope, CalendarPlus, X, CheckCircle2, Calendar, User,
    ChevronLeft, ChevronRight, Save, Loader2, ArrowUpDown
} from 'lucide-react';
import { TelehealthIframeModal } from '@/components/telehealth/TelehealthIframeModal';
import { toast } from 'sonner';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast, startOfDay, getDay } from 'date-fns';

interface WaitlistEntry {
    id: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    serviceKey: string;
    serviceName: string;
    status: string;
    createdAt: Date;
    meetingUrl: string;
    intakeAnswers: Record<string, any>;
    priority: 'high' | 'normal' | 'low';
}

const TIME_SLOTS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30',
];

function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
}

/* ─── Inline Scheduling Modal ──────────────────────────── */
function ScheduleModal({
    entry,
    providerName,
    onClose,
    onScheduled,
}: {
    entry: WaitlistEntry;
    providerName: string;
    onClose: () => void;
    onScheduled: () => void;
}) {
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState<'intake' | 'schedule'>('intake');

    // Build calendar grid
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPad = getDay(monthStart); // 0=Sun

    const handleConfirm = async () => {
        if (!selectedDate || !selectedTime) return;
        const user = auth.currentUser;
        if (!user) return;

        setSaving(true);
        try {
            const [hour, minute] = selectedTime.split(':').map(Number);
            const scheduledAt = new Date(selectedDate);
            scheduledAt.setHours(hour, minute, 0, 0);
            const ts = Timestamp.fromDate(scheduledAt);

            // Update the main document (consultation or appointment)
            const consultRef = doc(db, 'consultations', entry.id);
            const apptRef = doc(db, 'appointments', entry.id);
            const consultSnap = await getDoc(consultRef);

            const updatePayload = {
                status: 'scheduled',
                scheduledAt: ts,
                startTime: ts,
                date: format(scheduledAt, 'yyyy-MM-dd'),
                time: selectedTime,
                providerName,
                providerId: user.uid,
                meetingUrl: entry.meetingUrl,
                notes: notes || undefined,
                updatedAt: serverTimestamp(),
            };

            if (consultSnap.exists()) {
                await updateDoc(consultRef, updatePayload);
            } else {
                // Try top-level appointments collection
                const apptSnap = await getDoc(apptRef);
                if (apptSnap.exists()) {
                    await updateDoc(apptRef, updatePayload);
                }
            }

            // Also write/merge into the patient's sub-collection so the patient portal sees it
            if (entry.patientId) {
                const patientApptRef = doc(
                    db, 'patients', entry.patientId, 'appointments', entry.id
                );
                await setDoc(patientApptRef, {
                    ...updatePayload,
                    patientId: entry.patientId,
                    patientName: entry.patientName,
                    consultationId: entry.id,
                    serviceKey: entry.serviceKey,
                    globalAppointmentId: entry.id,
                }, { merge: true });
            }

            // Also update the top-level appointments collection
            await setDoc(apptRef, {
                ...updatePayload,
                patientId: entry.patientId,
                patientName: entry.patientName,
                consultationId: entry.id,
                serviceKey: entry.serviceKey,
            }, { merge: true });

            toast.success(`Appointment scheduled for ${format(scheduledAt, 'MMM d, yyyy')} at ${formatTime(selectedTime)}`);
            onScheduled();
            onClose();
        } catch (err) {
            console.error('Scheduling error:', err);
            toast.error('Failed to schedule appointment. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[36px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">
                            Review &amp; Schedule
                        </p>
                        <h2 className="text-xl font-black tracking-tight">{entry.patientName}</h2>
                        <p className="text-indigo-200 text-sm font-medium mt-0.5">{entry.serviceName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Step tabs */}
                        <div className="flex bg-white/10 rounded-2xl p-1 gap-1">
                            <button
                                onClick={() => setStep('intake')}
                                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${step === 'intake' ? 'bg-white text-indigo-700' : 'text-indigo-200 hover:text-white'}`}
                            >
                                Intake
                            </button>
                            <button
                                onClick={() => setStep('schedule')}
                                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${step === 'schedule' ? 'bg-white text-indigo-700' : 'text-indigo-200 hover:text-white'}`}
                            >
                                Schedule
                            </button>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-6">

                    {/* ── Intake Tab ── */}
                    {step === 'intake' && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            {/* Patient info row */}
                            <div className="grid grid-cols-2 gap-4">
                                <InfoBlock label="Patient" value={entry.patientName} icon={<User className="w-4 h-4 text-indigo-500" />} />
                                <InfoBlock label="Email" value={entry.patientEmail || '—'} icon={<FileText className="w-4 h-4 text-indigo-500" />} />
                                <InfoBlock label="Service" value={entry.serviceName} icon={<Stethoscope className="w-4 h-4 text-indigo-500" />} />
                                <InfoBlock label="Submitted" value={format(entry.createdAt, 'MMM d, yyyy · h:mm a')} icon={<Clock className="w-4 h-4 text-indigo-500" />} />
                            </div>

                            {/* Intake Q&A */}
                            {Object.keys(entry.intakeAnswers).length > 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Intake Responses</p>
                                    {Object.entries(entry.intakeAnswers).map(([k, v]) => (
                                        <div key={k} className="space-y-1">
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{k.replace(/_/g, ' ')}</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{String(v) || '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-600 p-8 text-center">
                                    <p className="text-slate-400 text-sm font-semibold">No intake responses recorded</p>
                                </div>
                            )}

                            <button
                                onClick={() => setStep('schedule')}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                            >
                                <Calendar className="w-4 h-4" /> Proceed to Schedule
                            </button>
                        </div>
                    )}

                    {/* ── Schedule Tab ── */}
                    {step === 'schedule' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Mini calendar */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 p-5">
                                {/* Month nav */}
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:border-indigo-400 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </button>
                                    <span className="font-black text-slate-800 dark:text-slate-100 text-sm">
                                        {format(calendarMonth, 'MMMM yyyy')}
                                    </span>
                                    <button
                                        onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:border-indigo-400 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </button>
                                </div>

                                {/* Day headers */}
                                <div className="grid grid-cols-7 mb-2">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                        <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-1">{d}</div>
                                    ))}
                                </div>

                                {/* Day grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {/* Padding for month start */}
                                    {Array.from({ length: startPad }).map((_, i) => (
                                        <div key={`pad-${i}`} />
                                    ))}
                                    {days.map(day => {
                                        const isPastDay = isPast(startOfDay(addDays(day, 1)));
                                        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                                        const todayFlag = isToday(day);
                                        return (
                                            <button
                                                key={day.toISOString()}
                                                onClick={() => !isPastDay && setSelectedDate(day)}
                                                disabled={isPastDay}
                                                className={`
                                                    aspect-square rounded-xl text-sm font-bold transition-all
                                                    ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' :
                                                    todayFlag ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-700' :
                                                    isPastDay ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' :
                                                    'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-200'}
                                                `}
                                            >
                                                {format(day, 'd')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Time slots */}
                            {selectedDate && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                        Available Times · {format(selectedDate, 'EEEE, MMM d')}
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {TIME_SLOTS.map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setSelectedTime(t)}
                                                className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                                    selectedTime === t
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300'
                                                }`}
                                            >
                                                {formatTime(t)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Provider Notes (optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Add clinical notes, preparation instructions, or any notes for the patient..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all resize-none"
                                />
                            </div>

                            {/* Confirm selection summary */}
                            {selectedDate && selectedTime && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                                    <div>
                                        <p className="text-sm font-black text-indigo-800 dark:text-indigo-300">
                                            {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {formatTime(selectedTime)}
                                        </p>
                                        <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">
                                            Meeting link: {entry.meetingUrl}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'schedule' && (
                    <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedDate || !selectedTime || saving}
                            className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Confirm Appointment</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function InfoBlock({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1.5">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{value}</p>
        </div>
    );
}

/* ─── Main Page ──────────────────────────── */
export default function WaitlistPage() {
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterService, setFilterService] = useState('all');
    const [activeCall, setActiveCall] = useState<{ url: string; apptId: string; intake: any; name: string } | null>(null);
    const [schedulingEntry, setSchedulingEntry] = useState<WaitlistEntry | null>(null);
    const [providerName, setProviderName] = useState('Provider');
    const [sortOption, setSortOption] = useState<'date_asc' | 'date_desc' | 'name_asc' | 'name_desc'>('date_asc');
    const [, setTick] = useState(0);

    const getTimeElapsed = (date: Date) => {
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return '<1m';
        if (diffMins < 60) return `${diffMins}m`;
        const diffHrs = Math.floor(diffMins / 60);
        const remMins = diffMins % 60;
        if (diffHrs < 24) return `${diffHrs}h ${remMins}m`;
        return `${Math.floor(diffHrs / 24)}d ${diffHrs % 24}h`;
    };

    const enrichFromConsultation = async (apptId: string, data: Record<string, any>) => {
        let patientName = String(data.patient || data.patientName || '').trim() || 'Unknown Patient';
        let patientEmail = data.patientEmail || '';
        let patientUid = data.patientId || data.uid || '';
        let serviceKey = data.serviceKey || data.service || data.type || 'consultation';
        let intakeAnswers: Record<string, any> = data.intakeAnswers || {};
        let meetingUrl = data.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth';
        // Normalize any old per-appointment random URLs to the canonical clinic waiting room
        if (meetingUrl && meetingUrl.includes('doxy.me/patriotic-visit-')) {
            meetingUrl = 'https://PVT.doxy.me/patrioticvirtualtelehealth';
        }

        try {
            const consultSnap = await getDoc(doc(db, 'consultations', apptId));
            if (consultSnap.exists()) {
                const cd = consultSnap.data();
                intakeAnswers = cd.intake || intakeAnswers;
                serviceKey = cd.serviceKey || serviceKey;
                patientUid = cd.uid || cd.patientId || patientUid;
                meetingUrl = cd.meetingUrl || meetingUrl;
                const cdName = String(cd.patient || cd.patientName || '').trim();
                if (cdName && cdName !== 'Patient' && !cdName.toLowerCase().includes('unknown')) patientName = cdName;
                if (cd.intake?.firstName) {
                    patientName = `${cd.intake.firstName} ${cd.intake.lastName || ''}`.trim();
                }
                if (cd.intake?.email) patientEmail = cd.intake.email;
                if (cd.patientEmail) patientEmail = cd.patientEmail;
            }
        } catch (_) { /* silent */ }

        if (patientUid && patientName === 'Unknown Patient') {
            try {
                for (const coll of ['users', 'patients']) {
                    const snap = await getDoc(doc(db, coll, patientUid));
                    if (snap.exists()) {
                        const pd = snap.data();
                        const nm = pd.displayName || `${pd.firstName || ''} ${pd.lastName || ''}`.trim() || pd.name;
                        if (nm && !nm.toLowerCase().includes('unknown')) { patientName = nm; break; }
                        patientEmail = patientEmail || pd.email || '';
                    }
                }
            } catch (_) { /* silent */ }
        }

        if (patientName === 'Unknown Patient' && patientEmail) patientName = patientEmail.split('@')[0];

        return { patientName, patientEmail, patientUid, serviceKey, intakeAnswers, meetingUrl };
    };

    useEffect(() => {
        // Load provider name
        const loadProvider = async (uid: string) => {
            try {
                const snap = await getDoc(doc(db, 'users', uid));
                if (snap.exists()) {
                    const d = snap.data();
                    setProviderName(d.displayName || d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Provider');
                }
            } catch (_) {}
        };

        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (!user) return;
            loadProvider(user.uid);

            const apptQuery = query(
                collection(db, 'appointments'),
                where('providerId', '==', user.uid),
                where('status', 'in', ['waitlist', 'PENDING_SCHEDULING'])
            );

            const consultQuery = query(
                collection(db, 'consultations'),
                where('paymentStatus', '==', 'paid')
            );

            let apptEntries: WaitlistEntry[] = [];
            let consultEntries: WaitlistEntry[] = [];

            const updateCombined = () => {
                const combined = [...apptEntries];
                const apptIds = new Set(apptEntries.map(a => a.id));
                consultEntries.forEach(ce => {
                   if (!apptIds.has(ce.id)) {
                       combined.push(ce);
                   }
                });
                setEntries(combined.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
                setLoading(false);
            };

            const unsubAppt = onSnapshot(apptQuery, async (snap) => {
                apptEntries = await Promise.all(snap.docs.map(async (d) => {
                    const data = d.data();
                    let dateObj = new Date();
                    if (data.createdAt?.toDate) dateObj = data.createdAt.toDate();
                    else if (data.updatedAt?.toDate) dateObj = data.updatedAt.toDate();

                    const enriched = await enrichFromConsultation(d.id, data);
                    const svcName = enriched.serviceKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                    const priority: 'high' | 'normal' | 'low' =
                        enriched.serviceKey.includes('diagnostic') || enriched.serviceKey.includes('imaging') ? 'high' : 'normal';

                    return {
                        id: d.id,
                        patientId: enriched.patientUid,
                        patientName: enriched.patientName,
                        patientEmail: enriched.patientEmail,
                        serviceKey: enriched.serviceKey,
                        serviceName: svcName,
                        status: 'Waiting',
                        createdAt: dateObj,
                        meetingUrl: enriched.meetingUrl,
                        intakeAnswers: enriched.intakeAnswers,
                        priority,
                    } satisfies WaitlistEntry;
                }));
                updateCombined();
            });

            const unsubConsult = onSnapshot(consultQuery, async (snap) => {
                const waitlistConsults = snap.docs.filter(d => {
                   const status = (d.data().status || '').toLowerCase();
                   return !['scheduled', 'completed', 'cancelled'].includes(status);
                });

                const enrichedCons = await Promise.all(waitlistConsults.map(async (d) => {
                    const data = d.data();
                    let dateObj = new Date();
                    if (data.createdAt?.toDate) dateObj = data.createdAt.toDate();
                    else if (data.updatedAt?.toDate) dateObj = data.updatedAt.toDate();

                    const enriched = await enrichFromConsultation(d.id, data);
                    const svcName = enriched.serviceKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                    const priority: 'high' | 'normal' | 'low' =
                        enriched.serviceKey.includes('diagnostic') || enriched.serviceKey.includes('imaging') ? 'high' : 'normal';

                    return {
                        id: d.id,
                        patientId: enriched.patientUid,
                        patientName: enriched.patientName,
                        patientEmail: enriched.patientEmail,
                        serviceKey: enriched.serviceKey,
                        serviceName: svcName,
                        status: 'Waiting',
                        createdAt: dateObj,
                        meetingUrl: enriched.meetingUrl,
                        intakeAnswers: enriched.intakeAnswers,
                        priority,
                    } satisfies WaitlistEntry;
                }));

                consultEntries = enrichedCons;
                updateCombined();
            });

            return () => {
                unsubAppt();
                unsubConsult();
            }
        });

        return () => unsubAuth();
    }, []);

    // Re-render elapsed times every 60s
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    const uniqueServices = Array.from(new Set(entries.map(e => e.serviceKey)));

    const filteredEntries = entries.filter(e => {
        const matchesSearch =
            e.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.patientEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSvc = filterService === 'all' || e.serviceKey === filterService;
        return matchesSearch && matchesSvc;
    }).sort((a, b) => {
        if (sortOption === 'date_desc') return b.createdAt.getTime() - a.createdAt.getTime();
        if (sortOption === 'date_asc') return a.createdAt.getTime() - b.createdAt.getTime();
        if (sortOption === 'name_asc') return a.patientName.localeCompare(b.patientName);
        if (sortOption === 'name_desc') return b.patientName.localeCompare(a.patientName);
        return 0;
    });

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24">
            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-10 text-white shadow-2xl border border-white/5">
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #6366f1 0px, transparent 60%), radial-gradient(circle at 10% 80%, #4f46e5 0px, transparent 50%)' }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                <Clock className="w-5 h-5 text-indigo-300" />
                            </div>
                            <span className="text-indigo-300 font-black uppercase tracking-[0.2em] text-[10px]">Live Queue</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">Patient Waitlist</h1>
                        <p className="text-slate-400 text-sm font-medium max-w-lg leading-relaxed mt-2">
                            Live triage queue. Patients sorted by arrival time and clinical priority. Click <strong>Review &amp; Schedule</strong> to confirm an appointment time.
                        </p>
                    </div>

                    {/* Stats chips */}
                    <div className="flex gap-4 shrink-0">
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center min-w-[100px]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Waiting</div>
                            <div className="text-4xl font-black tabular-nums">{entries.length}</div>
                        </div>
                        <div className="bg-rose-500/10 backdrop-blur-sm rounded-2xl p-5 border border-rose-400/20 text-center min-w-[100px]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-rose-300 mb-1">High Priority</div>
                            <div className="text-4xl font-black tabular-nums text-rose-400">
                                {entries.filter(e => e.priority === 'high').length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Search & Filter Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 rounded-[28px] p-3 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name, email, or service..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-[20px] text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-200/60 dark:focus:ring-indigo-500/30 transition-all border border-transparent dark:border-slate-700"
                    />
                </div>
                <div className="relative shrink-0">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Filter className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        value={filterService}
                        onChange={(e) => setFilterService(e.target.value)}
                        className="appearance-none pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-[20px] text-sm font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-200/60 dark:focus:ring-indigo-500/30 transition-all cursor-pointer border border-transparent dark:border-slate-700"
                    >
                        <option value="all">All Services</option>
                        {uniqueServices.map(s => (
                            <option key={s} value={s}>
                                {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="relative shrink-0">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        value={sortOption}
                        onChange={(e: any) => setSortOption(e.target.value)}
                        className="appearance-none pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-[20px] text-sm font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-200/60 dark:focus:ring-indigo-500/30 transition-all cursor-pointer border border-transparent dark:border-slate-700"
                    >
                        <option value="date_asc">Oldest First (Date ↑)</option>
                        <option value="date_desc">Newest First (Date ↓)</option>
                        <option value="name_asc">Patient Name (A-Z)</option>
                        <option value="name_desc">Patient Name (Z-A)</option>
                    </select>
                </div>
            </div>

            {/* ── Waitlist Cards ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-28 space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-400 font-semibold text-sm">Syncing live queue...</p>
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700 p-24 flex flex-col items-center text-center space-y-5 shadow-sm">
                    <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-[28px] flex items-center justify-center rotate-2">
                        <CheckCircle className="w-12 h-12 text-emerald-400 dark:text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">Queue is Clear</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm leading-relaxed">
                            {searchTerm || filterService !== 'all'
                                ? 'No patients match your current filters. Try adjusting your search.'
                                : 'No patients are currently waiting. New bookings will appear here in real time.'}
                        </p>
                    </div>
                    {(searchTerm || filterService !== 'all') && (
                        <button
                            onClick={() => { setSearchTerm(''); setFilterService('all'); }}
                            className="text-indigo-600 font-bold text-sm hover:underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredEntries.map((entry, index) => (
                        <div
                            key={entry.id}
                            className="group relative bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 hover:border-indigo-100 dark:hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                        >
                            {/* Priority / 'Up Next' accent bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[28px] transition-all
                                ${entry.priority === 'high' ? 'bg-gradient-to-b from-rose-400 to-rose-600' :
                                    index === 0 ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' :
                                        'bg-gradient-to-b from-indigo-400 to-indigo-600 opacity-0 group-hover:opacity-100'}`}
                            />

                            <div className="p-5 md:p-6 pl-8 flex flex-col md:flex-row gap-5 items-start md:items-center">
                                {/* Wait-time badge */}
                                <div className="w-[72px] h-[72px] rounded-[20px] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:border-indigo-100 dark:group-hover:border-indigo-500/30 transition-colors">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-400 dark:group-hover:text-indigo-300">Wait</span>
                                    <span className="text-lg font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 leading-tight mt-0.5">
                                        {getTimeElapsed(entry.createdAt)}
                                    </span>
                                </div>

                                {/* Patient info */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 truncate">{entry.patientName}</h3>
                                        {entry.priority === 'high' && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg border border-rose-100 dark:border-rose-400/20">
                                                <AlertCircle className="w-2.5 h-2.5" /> Priority
                                            </span>
                                        )}
                                        {index === 0 && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-400/20">
                                                ✓ Up Next
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                                        <span className="text-slate-400 truncate">{entry.patientEmail || '—'}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                                        <span className="flex items-center gap-1.5 text-indigo-500 truncate">
                                            <Stethoscope className="w-3.5 h-3.5" />
                                            {entry.serviceName}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                                        <span className="text-slate-400 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 opacity-60" />
                                            Submitted {entry.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {entry.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-slate-50 dark:border-slate-700 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={() => { /* Future: open intake drawer */ }}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-colors border border-slate-100 dark:border-slate-700 dark:border-slate-600"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Intake
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Doxy's provider auth (Frontegg) cannot authenticate inside an iframe
                                            // due to third-party cookie restrictions. Open in new tab instead.
                                            window.open('https://doxy.me/sign-in', '_blank', 'noopener,noreferrer');
                                        }}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-colors border border-slate-100 dark:border-slate-700 dark:border-slate-600 shadow-sm"
                                    >
                                        <Video className="w-4 h-4" /> Admit
                                    </button>
                                    <button
                                        onClick={() => setSchedulingEntry(entry)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 hover:shadow-indigo-300 dark:hover:shadow-indigo-900/60 active:scale-95"
                                    >
                                        <CalendarPlus className="w-4 h-4 opacity-90" /> Review &amp; Schedule
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Telehealth Modal */}
            <TelehealthIframeModal
                isOpen={!!activeCall}
                onClose={() => setActiveCall(null)}
                role="provider"
                videoLink={activeCall?.url || 'https://doxy.me/sign-in'}
                appointmentId={activeCall?.apptId}
                intakeAnswers={activeCall?.intake}
                patientName={activeCall?.name}
            />

            {/* Scheduling Modal */}
            {schedulingEntry && (
                <ScheduleModal
                    entry={schedulingEntry}
                    providerName={providerName}
                    onClose={() => setSchedulingEntry(null)}
                    onScheduled={() => {
                        // Remove this entry from the local list immediately (optimistic UI)
                        setEntries(prev => prev.filter(e => e.id !== schedulingEntry.id));
                        setSchedulingEntry(null);
                    }}
                />
            )}
        </div>
    );
}
