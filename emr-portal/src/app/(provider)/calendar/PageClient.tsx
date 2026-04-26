"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, ChevronDown, Plus, Filter, Settings,
    Calendar as CalendarIcon, User, Search, Video, Clock, FileText,
    MapPin, X, CheckCircle2, AlertTriangle, RefreshCw, MessageSquare,
    Phone, MoreVertical, Repeat, Check, UserX, ArrowRight, ShieldCheck, ChevronDown as ChevronDownIcon
} from 'lucide-react';
import {
    format, addWeeks, subWeeks, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameDay, isToday, addDays, subDays,
    startOfMonth, endOfMonth, startOfDay, endOfDay, addMonths, subMonths, isWithinInterval
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { ProviderRescheduleModal } from '@/components/provider/ProviderRescheduleModal';
import { db } from '@/lib/firebase';
import { formatDateForInput, formatTimeForInput, validateFutureAppointmentInput } from '@/lib/provider-appointment-actions';
import {
    collection, onSnapshot, query, orderBy, addDoc, getDocs,
    limit, where, updateDoc, doc, Timestamp, getDoc
} from 'firebase/firestore';
import { AITextarea } from '@/components/ui/AITextarea';

// â”€â”€â”€ CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM â†’ 7 PM
const WORKING_START = 8;
const WORKING_END = 18;
const SLOT_HEIGHT = 80; // px per hour

const STATUS_CONFIG: Record<string, { label: string; dot: string; border: string; bg: string }> = {
    confirmed: { label: 'Confirmed', dot: 'bg-blue-500', border: 'border-blue-500', bg: 'bg-blue-50' },
    pending: { label: 'Pending', dot: 'bg-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-50' },
    paid: { label: 'Confirmed', dot: 'bg-blue-500', border: 'border-blue-500', bg: 'bg-blue-50' },
    scheduled: { label: 'Scheduled', dot: 'bg-blue-500', border: 'border-blue-500', bg: 'bg-blue-50' },
    checked_in: { label: 'Checked In', dot: 'bg-emerald-500', border: 'border-emerald-500', bg: 'bg-emerald-50' },
    no_show: { label: 'No-Show', dot: 'bg-red-500', border: 'border-red-500', bg: 'bg-red-50' },
    completed: { label: 'Completed', dot: 'bg-slate-400', border: 'border-slate-400', bg: 'bg-slate-50' },
    cancelled: { label: 'Cancelled', dot: 'bg-slate-400', border: 'border-slate-400', bg: 'bg-slate-50' },
};

const TYPE_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; badge: string }> = {
    video: { label: 'VIDEO', border: 'border-cyan-500', bg: 'bg-cyan-50/90', text: 'text-cyan-900', badge: 'bg-cyan-100 text-cyan-700' },
    telehealth: { label: 'VIDEO', border: 'border-cyan-500', bg: 'bg-cyan-50/90', text: 'text-cyan-900', badge: 'bg-cyan-100 text-cyan-700' },
    'Telehealth': { label: 'VIDEO', border: 'border-cyan-500', bg: 'bg-cyan-50/90', text: 'text-cyan-900', badge: 'bg-cyan-100 text-cyan-700' },
    'in-person': { label: 'IN-PERSON', border: 'border-emerald-500', bg: 'bg-emerald-50/90', text: 'text-emerald-900', badge: '' },
    initial: { label: 'INITIAL', border: 'border-violet-500', bg: 'bg-violet-50/90', text: 'text-violet-900', badge: '' },
    followup: { label: 'FOLLOW-UP', border: 'border-amber-500', bg: 'bg-amber-50/90', text: 'text-amber-900', badge: '' },
};

// â”€â”€â”€ SAFE DATE HELPER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Handles Firestore Timestamp, JS Date, 'YYYY-MM-DD' string, ISO string, epoch
function toSafeDate(value: any): Date | null {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();     // Firestore Timestamp
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

// Get the best Date for an appointment, preferring startTime (Timestamp) over date+time strings
function getApptDate(appt: any): Date | null {
    if (!appt || typeof appt !== 'object') return null;
    // 1. Use Firestore Timestamp startTime if available (most reliable)
    if (appt.startTime?.toDate) return appt.startTime.toDate();
    // 2. Combine date string + time string
    if (typeof appt.date === 'string' && appt.date) {
        const timeStr = appt.time || '00:00';
        const d = new Date(`${appt.date}T${timeStr}:00`);
        if (!isNaN(d.getTime())) return d;
    }
    // 3. Try toSafeDate on date field alone (handles legacy Timestamp date)
    const fromDate = toSafeDate(appt.date);
    if (fromDate) return fromDate;
    return null;
}

function getTypeConfig(appt: any) {
    const t = (appt.type || '').toLowerCase();
    const s = (appt.service || '').toLowerCase();
    if (t === 'video' || t === 'telehealth') return TYPE_CONFIG.video;
    if (t === 'in-person') return TYPE_CONFIG['in-person'];
    if (s.includes('initial') || s.includes('consultation')) return TYPE_CONFIG.initial;
    if (s.includes('follow')) return TYPE_CONFIG.followup;
    return TYPE_CONFIG.video;
}

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

function isJoinActive(appt: any): boolean {
    const type = (appt.type || '').toLowerCase();
    if (type !== 'video' && type !== 'telehealth') return false;
    const apptTime = getApptDate(appt);
    if (!apptTime) return false;
    const now = new Date();
    const diffMs = apptTime.getTime() - now.getTime();
    return diffMs <= 10 * 60 * 1000 && diffMs > -60 * 60 * 1000;
}

function getPatientLabel(appt: any) {
    const name = appt.patientName || appt.patient || '';
    if (!name || name.trim() === '' || name.toLowerCase() === 'unknown' || name.toLowerCase() === 'unknown patient') {
        const id = appt.patientId || appt.id || '';
        return { name: `Patient #${id.slice(0, 6)}`, isFallback: true };
    }
    return { name, isFallback: false };
}

// â”€â”€â”€ APPOINTMENT CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AppointmentCard({
    appt, style, onClickCard, onStatusChange, onDragStart
}: {
    appt: any;
    style: React.CSSProperties;
    onClickCard: (appt: any) => void;
    onStatusChange: (id: string, status: string) => void;
    onDragStart: (e: React.DragEvent, appt: any) => void;
}) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const { name, isFallback } = getPatientLabel(appt);
    const typeConf = getTypeConfig(appt);
    const statusConf = getStatusConfig(appt.status);
    const joinActive = isJoinActive(appt);
    const isVideo = (appt.type || '').toLowerCase() === 'video' || (appt.type || '').toLowerCase() === 'telehealth';

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    useEffect(() => {
        const close = () => setContextMenu(null);
        if (contextMenu) window.addEventListener('click', close, { once: true });
        return () => window.removeEventListener('click', close);
    }, [contextMenu]);

    // FIX: use getApptDate() for display time
    const apptDate = getApptDate(appt);
    const displayTime = apptDate ? format(apptDate, 'h:mm a') : (appt.time || '');

    return (
        <div
            style={style}
            draggable
            onDragStart={(e) => onDragStart(e, appt)}
            onContextMenu={handleContextMenu}
            onClick={() => onClickCard(appt)}
            className={`absolute left-1 right-1 border-l-4 rounded-xl p-2.5 text-xs shadow-sm cursor-pointer hover:shadow-md transition-all z-10 overflow-hidden group select-none
                ${typeConf.bg} ${typeConf.border} ${typeConf.text}`}
        >
            <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConf.dot}`} />
                    {isFallback ? (
                        <span className="font-bold text-[11px] text-slate-400 flex items-center gap-1 truncate">
                            <AlertTriangle size={9} className="text-amber-400 flex-shrink-0" />
                            {name}
                        </span>
                    ) : (
                        <span className="font-black text-[12px] leading-tight truncate">{name}</span>
                    )}
                </div>
                {appt.isRecurring && <Repeat size={10} className="flex-shrink-0 opacity-50 mt-0.5" />}
            </div>

            <div className="text-[10px] font-semibold opacity-60 truncate mb-1.5">
                {appt.service || appt.type || 'Consultation'}
            </div>

            <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold opacity-70">{displayTime}</span>
                {isVideo && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider ${typeConf.badge}`}>
                        VIDEO
                    </span>
                )}
            </div>

            {isVideo && (
                <div className="mt-1.5" title={joinActive ? 'Join Telehealth Visit' : 'Available 10 min before appointment'}>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (joinActive) alert('Joining...'); }}
                        disabled={!joinActive}
                        className={`w-full text-[9px] font-black rounded-lg py-1 transition-all ${joinActive
                            ? 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm shadow-cyan-300'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        {joinActive ? 'Join Now' : 'Locked'}
                    </button>
                </div>
            )}

            {contextMenu && (
                <div
                    style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed', zIndex: 9999 }}
                    className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    {['confirmed', 'checked_in', 'no_show', 'completed', 'cancelled'].map(s => (
                        <button
                            key={s}
                            onClick={() => { onStatusChange(appt.id, s); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 dark:text-slate-300"
                        >
                            <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.dot}`} />
                            {STATUS_CONFIG[s]?.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// â”€â”€â”€ SLIDE-OUT PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SlideOutPanel({ appt, onClose, onStatusChange, onOpenReschedule, onCancelAppointment }: {
    appt: any | null;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
    onOpenReschedule: (appt: any) => void;
    onCancelAppointment: (appt: any) => void;
}) {
    const [intakeData, setIntakeData] = useState<Record<string, any> | null>(null);
    const [intakeLoading, setIntakeLoading] = useState(false);
    const [screeningOpen, setScreeningOpen] = useState(true);
    
    // SOAP Notes State
    const [chartOpen, setChartOpen] = useState(false);
    const [soapNotes, setSoapNotes] = useState(appt?.soapNotes || '');
    const [isSavingSoap, setIsSavingSoap] = useState(false);

    // Fetch full appointment doc (including intakeData and soapNotes) when panel opens
    useEffect(() => {
        if (!appt?.id) { setIntakeData(null); return; }
        setIntakeLoading(true);
        getDoc(doc(db, 'appointments', appt.id))
            .then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    setIntakeData(data.intakeData || null);
                    if (data.soapNotes) setSoapNotes(data.soapNotes);
                } else {
                    setIntakeData(null);
                }
            })
            .catch(() => setIntakeData(null))
            .finally(() => setIntakeLoading(false));
    }, [appt?.id]);

    if (!appt) return null;
    const { name, isFallback } = getPatientLabel(appt);
    const typeConf = getTypeConfig(appt);
    const statusConf = getStatusConfig(appt.status);
    const joinActive = isJoinActive(appt);
    const isVideo = (appt.type || '').toLowerCase() === 'video' || (appt.type || '').toLowerCase() === 'telehealth';
    const apptDate = getApptDate(appt);
    const displayDateTime = apptDate ? format(apptDate, 'h:mm a • MMM d, yyyy') : (appt.time || '—');

    // Format intake question keys into readable labels
    const formatKey = (key: string) =>
        key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase()).trim();

    const intakeEntries = intakeData ? Object.entries(intakeData) : [];

    const handleSaveChart = async () => {
        if (!appt?.id) return;
        setIsSavingSoap(true);
        try {
            await updateDoc(doc(db, 'appointments', appt.id), { soapNotes });
            alert('SOAP notes saved successfully.');
        } catch (e) {
            alert('Failed to save SOAP notes.');
        } finally {
            setIsSavingSoap(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-800 dark:bg-slate-800 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700 dark:border-slate-700 animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className={`p-5 border-b border-slate-100 dark:border-slate-700 ${typeConf.bg} border-l-4 ${typeConf.border}`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2.5 h-2.5 rounded-full ${statusConf.dot}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${statusConf.dot.replace('bg-', 'text-')}`}>
                                    {statusConf.label}
                                </span>
                                {isVideo && (
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${typeConf.badge}`}>VIDEO</span>
                                )}
                            </div>
                            {isFallback ? (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <AlertTriangle size={14} className="text-amber-400" />
                                    <h2 className="text-base font-bold">{name}</h2>
                                </div>
                            ) : (
                            <h2 className="text-xl font-black text-slate-900 dark:text-white dark:text-slate-100">{name}</h2>
                            )}
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                {appt.service || appt.type || 'Consultation'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {/* Basic details */}
                    <div className="p-5 space-y-4 border-b border-slate-100 dark:border-slate-700">
                        <DetailRow icon={<Clock size={14} />} label="Time" value={displayDateTime} />
                        <DetailRow icon={<User size={14} />} label="Provider" value={appt.providerName || appt.doctor || '—'} />
                        <DetailRow icon={<FileText size={14} />} label="Visit Reason" value={appt.notes || appt.service || '—'} />
                        {appt.patientId && <DetailRow icon={<User size={14} />} label="Patient ID" value={appt.patientId.slice(0, 12)} />}
                    </div>

                    {/* ── PATIENT CHART / SOAP NOTES ── */}
                    <div className="border-b border-slate-100 dark:border-slate-700">
                        <button
                            onClick={() => setChartOpen(o => !o)}
                            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={15} className="text-indigo-500" />
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Patient Chart & SOAP Notes</span>
                            </div>
                            <ChevronDownIcon size={14} className={`text-slate-400 transition-transform duration-200 ${chartOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {chartOpen && (
                            <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                        Clinical SOAP Notes
                                    </label>
                                    <AITextarea
                                        className="w-full h-32 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="S: Subjective&#10;O: Objective&#10;A: Assessment&#10;P: Plan"
                                        value={soapNotes}
                                        onValueChange={setSoapNotes}
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveChart}
                                            disabled={isSavingSoap}
                                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                                        >
                                            {isSavingSoap ? 'Saving...' : 'Save Notes'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* â”€â”€ SAFETY SCREENING SECTION â”€â”€ */}
                    <div className="border-b border-slate-100 dark:border-slate-700">
                        <button
                            onClick={() => setScreeningOpen(o => !o)}
                            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={15} className="text-emerald-500" />
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Safety Screening</span>
                                {intakeEntries.length > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black">
                                        {intakeEntries.length} answers
                                    </span>
                                )}
                            </div>
                            <ChevronDownIcon size={14} className={`text-slate-400 transition-transform duration-200 ${screeningOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {screeningOpen && (
                            <div className="px-5 pb-5">
                                {/* Subheading matching the booking page */}
                                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                                    These questions follow our clinical safety protocols.
                                </p>

                                {intakeLoading ? (
                                    <div className="flex items-center gap-2 py-4">
                                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs text-slate-400">Loading intake data...</span>
                                    </div>
                                ) : intakeEntries.length === 0 ? (
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-center">
                                        <ShieldCheck size={20} className="text-slate-300 mx-auto mb-1.5" />
                                        <p className="text-xs text-slate-400 font-medium">No intake answers on file</p>
                                        <p className="text-[10px] text-slate-300 mt-0.5">Patient may have booked before screening was added</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {intakeEntries.map(([key, value]) => (
                                            <div key={key} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                                    {formatKey(key)}
                                                </p>
                                                <p className={`text-sm font-semibold ${value === true || value === 'yes' || value === 'Yes'
                                                    ? 'text-amber-700'
                                                    : value === false || value === 'no' || value === 'No'
                                                        ? 'text-emerald-700'
                                                        : 'text-slate-800'
                                                    }`}>
                                                    {typeof value === 'boolean'
                                                        ? (value ? 'Alert: Yes' : 'No')
                                                        : String(value || '—')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Status update */}
                    <div className="p-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Update Status</p>
                        <div className="grid grid-cols-2 gap-2">
                            {(['confirmed', 'checked_in', 'no_show', 'completed'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => onStatusChange(appt.id, s)}
                                    className={`text-[10px] font-black px-3 py-2 rounded-xl border-2 transition-all flex items-center gap-1.5 ${appt.status === s
                                        ? `${STATUS_CONFIG[s].border} ${STATUS_CONFIG[s].bg}`
                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                                    {STATUS_CONFIG[s].label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="p-5 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    {isVideo && (
                        <button
                            disabled={!joinActive}
                            title={joinActive ? undefined : 'Available 10 min before appointment'}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${joinActive
                                ? 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg shadow-cyan-200'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            <Video size={16} />
                            {joinActive ? 'Start Telehealth Visit' : 'Join Available 10 Min Before'}
                        </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors text-slate-600 dark:text-slate-300">
                            <MessageSquare size={13} /> Message
                        </button>
                        <button
                            onClick={() => onOpenReschedule(appt)}
                            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors text-slate-600 dark:text-slate-300"
                        >
                            <RefreshCw size={13} /> Reschedule
                        </button>
                    </div>
                    {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                        <button
                            onClick={() => onCancelAppointment(appt)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-rose-100 text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                            <X size={13} /> Cancel Appointment
                        </button>
                    )}
                    <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
                        <UserX size={13} /> Mark No-Show
                    </button>
                </div>
            </div>
        </>
    );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-700 border border-slate-100 dark:border-slate-700 dark:border-slate-600 flex items-center justify-center text-slate-400 flex-shrink-0">
                                {icon}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 dark:text-slate-200 mt-0.5">{value}</p>
                            </div>
                        </div>
    );
}

// â”€â”€â”€ MAIN COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CalendarPage() {
    const router = useRouter();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('week');
    const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [availability, setAvailability] = useState<any[]>([]);
    const [dbLoading, setDbLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
    const [rescheduleAppt, setRescheduleAppt] = useState<any | null>(null);
    const [rescheduleError, setRescheduleError] = useState<string | null>(null);
    const [rescheduleSaving, setRescheduleSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [draggedAppt, setDraggedAppt] = useState<any | null>(null);

    const [apptForm, setApptForm] = useState({
        patientName: '', date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', type: 'video', notes: ''
    });

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const callAppointmentUpdate = async (appointmentId: string, body: Record<string, unknown>) => {
        const { auth } = await import('@/lib/firebase');
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(`/api/dashboard/appointments/${appointmentId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
            throw new Error(payload?.error || 'Appointment update failed.');
        }

        return payload;
    };

    // â”€â”€â”€ REALTIME SYNC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    useEffect(() => {
        import('@/lib/firebase').then(({ auth }) => {
            const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
                if (user) {
                    const { doc: fireDoc, getDoc } = await import('firebase/firestore');
                    let fetchedName = user.displayName || 'Provider';
                    try {
                        const userSnap = await getDoc(fireDoc(db, 'users', user.uid));
                        if (userSnap.exists() && userSnap.data().name) {
                            fetchedName = userSnap.data().name;
                        } else {
                            const patientSnap = await getDoc(fireDoc(db, 'patients', user.uid));
                            if (patientSnap.exists()) {
                                const d = patientSnap.data();
                                if (d.name) fetchedName = d.name;
                                else if (d.firstName) fetchedName = `${d.firstName} ${d.lastName || ''}`.trim();
                            }
                        }
                    } catch (e) { console.error(e); }

                    setTeamMembers([{
                        id: user.uid, name: fetchedName,
                        initials: fetchedName.substring(0, 2).toUpperCase(),
                        color: 'bg-indigo-100 text-indigo-700', checked: true
                    }]);

                    const { where: fiWhere } = await import('firebase/firestore');

                    // FIX: Also query appointments where providerId is not set but status is 'scheduled'
                    // so freshly-scheduled ones always appear regardless of provider query
                    const apptQ = query(collection(db, 'appointments'), fiWhere('providerId', '==', user.uid));
                    const unsubAppts = onSnapshot(apptQ, snap => {
                        setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                        setDbLoading(false);
                    }, () => setDbLoading(false));

                    const availQ = query(collection(db, 'availability'), fiWhere('doctorId', '==', user.uid));
                    const unsubAvail = onSnapshot(availQ, snap => {
                        setAvailability(snap.docs.map(d => ({ id: d.id, ...d.data(), isBlock: true })));
                    });

                    return () => { unsubAppts(); unsubAvail(); };
                } else {
                    setDbLoading(false);
                }
            });
            return () => unsubscribeAuth();
        }).catch(() => setDbLoading(false));
    }, []);

    useEffect(() => {
        getDocs(query(collection(db, 'patients'), limit(50))).then(snap => {
            const data = snap.docs.map(d => ({
                id: d.id,
                name: ((d.data().firstName || '') + ' ' + (d.data().lastName || d.data().name || '')).trim() || 'Unknown',
                ...d.data()
            }));
            setPatients(data.length ? data : [{ id: 'demo-1', name: 'John Doe' }]);
        }).catch(() => setPatients([{ id: 'demo-1', name: 'John Doe' }]));
    }, []);

    // â”€â”€â”€ VIEW LOGIC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const getViewRange = () => {
        if (viewType === 'day') return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
        if (viewType === 'month') return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
        return { start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) };
    };

    const { start: viewStart, end: viewEnd } = getViewRange();
    const viewDays = eachDayOfInterval({ start: viewStart, end: viewEnd });

    const handleNext = () => {
        if (viewType === 'day') setCurrentDate(addDays(currentDate, 1));
        else if (viewType === 'month') setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(addWeeks(currentDate, 1));
    };

    const handlePrev = () => {
        if (viewType === 'day') setCurrentDate(subDays(currentDate, 1));
        else if (viewType === 'month') setCurrentDate(subMonths(currentDate, 1));
        else setCurrentDate(subWeeks(currentDate, 1));
    };

    // â”€â”€â”€ APPOINTMENT STYLE (position) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // FIX: Use getApptDate() which handles Firestore Timestamps, strings, and Date objects

    const getApptStyle = (appt: any): React.CSSProperties => {
        const dt = getApptDate(appt) || new Date();
        const top = ((dt.getHours() - 7) * SLOT_HEIGHT) + ((dt.getMinutes() / 60) * SLOT_HEIGHT);
        return { position: 'absolute', top: `${Math.max(0, top)}px`, height: `${SLOT_HEIGHT}px`, left: 4, right: 4 };
    };

    // â”€â”€â”€ STATUS UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await callAppointmentUpdate(id, {
                action: 'status',
                status,
            });
            if (selectedAppt?.id === id) setSelectedAppt((prev: any) => ({ ...prev, status }));
            showToast(`Status updated to "${STATUS_CONFIG[status]?.label}"`);
        } catch (e) { showToast('Failed to update status.'); }
    };

    const openRescheduleModal = (appt: any) => {
        setRescheduleError(null);
        setRescheduleAppt(appt);
    };

    const handleCancelAppointment = async (appt: any) => {
        if (!window.confirm('Cancel this appointment?')) {
            return;
        }

        await handleStatusChange(appt.id, 'cancelled');
    };

    const handleConfirmReschedule = async ({ date, time }: { date: string; time: string }) => {
        if (!rescheduleAppt) return;

        const validationError = validateFutureAppointmentInput(date, time);
        if (validationError) {
            setRescheduleError(validationError);
            return;
        }

        setRescheduleSaving(true);
        setRescheduleError(null);

        try {
            const previousStart = getApptDate(rescheduleAppt);
            const previousDate = previousStart ? format(previousStart, 'yyyy-MM-dd') : rescheduleAppt.date;
            const previousTime = previousStart ? format(previousStart, 'HH:mm') : rescheduleAppt.time;

            await callAppointmentUpdate(rescheduleAppt.id, {
                action: 'reschedule',
                date,
                time,
                previousDate,
                previousTime,
            });

            if (selectedAppt?.id === rescheduleAppt.id) {
                const nextStart = new Date(`${date}T${time}:00`);
                setSelectedAppt((prev: any) => ({
                    ...prev,
                    date,
                    time,
                    startTime: Timestamp.fromDate(nextStart),
                }));
            }

            showToast(`Appointment rescheduled to ${format(new Date(`${date}T${time}:00`), 'EEE MMM d')} at ${time}`);
            setRescheduleAppt(null);
        } catch (error) {
            setRescheduleError(error instanceof Error ? error.message : 'Reschedule failed.');
        } finally {
            setRescheduleSaving(false);
        }
    };

    // â”€â”€â”€ DRAG & DROP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleDragStart = (e: React.DragEvent, appt: any) => {
        setDraggedAppt(appt);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, day: Date, hour: number) => {
        e.preventDefault();
        if (!draggedAppt) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const minuteOffset = Math.round((relY / SLOT_HEIGHT) * 60 / 15) * 15;
        const newTime = `${hour.toString().padStart(2, '0')}:${minuteOffset.toString().padStart(2, '0')}`;
        const newDate = format(day, 'yyyy-MM-dd');
        const newStart = new Date(`${newDate}T${newTime}:00`);
        if (newStart.getTime() < Date.now()) {
            showToast('Appointments cannot be moved into the past.');
            setDraggedAppt(null);
            return;
        }
        const previousStart = getApptDate(draggedAppt);
        const previousDate = previousStart ? format(previousStart, 'yyyy-MM-dd') : draggedAppt.date;
        const previousTime = previousStart
            ? format(previousStart, 'HH:mm')
            : (typeof draggedAppt.time === 'string' ? draggedAppt.time : undefined);

        try {
            await callAppointmentUpdate(draggedAppt.id, {
                action: 'reschedule',
                date: newDate,
                time: newTime,
                previousDate,
                previousTime,
            });

            showToast(`Appointment rescheduled to ${format(day, 'EEE MMM d')} at ${newTime}`);
        } catch (e) { showToast('Reschedule failed.'); }
        setDraggedAppt(null);
    };

    // â”€â”€â”€ BLOCK TIME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleBlockTime = async (date: Date, hour: number) => {
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + 60 * 60000);
        try {
            await addDoc(collection(db, 'availability'), {
                doctorId: teamMembers[0]?.id,
                startTime: start, endTime: end, type: 'block', createdAt: new Date()
            });
            showToast('Hour blocked.');
        } catch (e) { showToast('Failed to block time.'); }
    };

    const unblockTime = async (id: string) => {
        const { deleteDoc, doc: fd } = await import('firebase/firestore');
        try {
            await deleteDoc(fd(db, 'availability', id));
            showToast('Slot unblocked.');
        } catch (e) { showToast('Failed to unblock.'); }
    };

    // â”€â”€â”€ ADD APPOINTMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleScheduleVisit = async () => {
        if (!apptForm.patientName) { alert('Please select a patient.'); return; }
        try {
            const startDate = new Date(`${apptForm.date}T${apptForm.time}:00`);
            const pat = patients.find(p => p.name === apptForm.patientName);
            const patId = pat ? pat.id : '';

            const newRef = await addDoc(collection(db, 'appointments'), {
                patient: apptForm.patientName, patientName: apptForm.patientName,
                patientId: patId, patientUid: patId,
                date: apptForm.date, time: apptForm.time,
                startTime: Timestamp.fromDate(startDate),
                type: apptForm.type, notes: apptForm.notes,
                status: 'confirmed',
                providerId: teamMembers[0]?.id || '',
                providerName: teamMembers[0]?.name || 'Provider',
                doctor: teamMembers[0]?.name || 'Provider',
                service: apptForm.type === 'video' ? 'Follow-up (Video)' : 'Initial Consultation'
            });

            // TRIGGER BACKEND NOTIFICATION
            try {
                const { auth } = await import('@/lib/firebase');
                const tok = await auth.currentUser?.getIdToken();
                await fetch('/api/notifications/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                    body: JSON.stringify({
                        type: 'appointment_booked',
                        appointmentId: newRef.id
                    })
                });
            } catch (err) {
                console.error("Notification error:", err);
            }

            setIsModalOpen(false);
            setApptForm({ patientName: '', date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', type: 'video', notes: '' });
            showToast('Appointment scheduled!');
        } catch (e) { showToast('Failed to schedule visit.'); }
    };

    const toggleTeamMember = (id: string) =>
        setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, checked: !m.checked } : m));

    const allSelected = teamMembers.every(m => m.checked);
    const currentWeekRange = { start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) };

    // â”€â”€â”€ RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm overflow-hidden font-sans relative">
            <ProviderRescheduleModal
                open={Boolean(rescheduleAppt)}
                appointmentLabel={rescheduleAppt ? `${getPatientLabel(rescheduleAppt).name} • ${rescheduleAppt.service || rescheduleAppt.type || 'Consultation'}` : 'Appointment'}
                initialDateTime={getApptDate(rescheduleAppt)}
                submitting={rescheduleSaving}
                error={rescheduleError}
                onClose={() => {
                    if (rescheduleSaving) return;
                    setRescheduleAppt(null);
                    setRescheduleError(null);
                }}
                onSubmit={handleConfirmReschedule}
            />

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" /> {toast}
                </div>
            )}

            <SlideOutPanel
                appt={selectedAppt}
                onClose={() => setSelectedAppt(null)}
                onStatusChange={handleStatusChange}
                onOpenReschedule={openRescheduleModal}
                onCancelAppointment={handleCancelAppointment}
            />

            {isModalOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200 p-4">
                    <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 dark:border-slate-700 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="bg-indigo-600 p-6 text-white">
                            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold mb-1">New Telehealth Visit</h2>
                            <p className="text-indigo-100 text-sm">Schedule a visit with a patient.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300">Patient</label>
                                <select value={apptForm.patientName} onChange={e => setApptForm({ ...apptForm, patientName: e.target.value })}
                                    className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                                    <option value="" disabled>Select patient...</option>
                                    {patients.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300">Date</label>
                                    <input type="date" value={apptForm.date} onChange={e => setApptForm({ ...apptForm, date: e.target.value })}
                                        className="w-full h-11 pl-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300">Time</label>
                                    <input type="time" value={apptForm.time} onChange={e => setApptForm({ ...apptForm, time: e.target.value })}
                                        className="w-full h-11 pl-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300">Visit Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['video', 'in-person'].map(t => (
                                        <button key={t} onClick={() => setApptForm({ ...apptForm, type: t })}
                                            className={`h-11 rounded-xl border-2 font-bold text-sm transition-all ${apptForm.type === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}>
                                            {t === 'video' ? 'Video' : 'In-Person'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300">Notes</label>
                                <AITextarea placeholder="Reason for visit..." value={apptForm.notes}
                                    onValueChange={val => setApptForm({ ...apptForm, notes: val })}
                                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px] resize-none" />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 dark:text-slate-400">Cancel</button>
                            <button onClick={handleScheduleVisit}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                                Schedule Visit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <aside className="w-60 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-800 dark:bg-slate-800 flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-white dark:text-slate-100">{format(currentDate, 'MMMM yyyy')}</span>
                        <div className="flex gap-1">
                            <button onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-3.5 h-3.5 text-slate-500" /></button>
                            <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-3.5 h-3.5 text-slate-500" /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 font-black mb-1.5">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 text-center gap-y-1">
                        {viewDays.slice(0, 7).map((day, i) => {
                            const inCurrentWeek = isWithinInterval(day, currentWeekRange);
                            const isSelected = isSameDay(day, currentDate);
                            return (
                                <div key={i}
                                    onClick={() => { setCurrentDate(day); setViewType('day'); }}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto cursor-pointer text-xs font-bold transition-all
                                        ${isSelected ? 'bg-indigo-600 text-white' :
                                            inCurrentWeek ? 'bg-indigo-50 text-indigo-600' :
                                                isToday(day) ? 'ring-2 ring-indigo-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                                    {format(day, 'd')}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <FilterSection title="Team Members" defaultOpen>
                        <div onClick={() => teamMembers.forEach(m => setTeamMembers(prev => prev.map(x => ({ ...x, checked: !allSelected }))))}
                            className="flex items-center gap-3 mb-3 cursor-pointer">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                {allSelected && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">All team members</span>
                        </div>
                        {teamMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-3 mb-2.5 cursor-pointer" onClick={() => toggleTeamMember(member.id)}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${member.checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                                    {member.checked && <div className="w-1.5 h-1.5 bg-white dark:bg-slate-800 rounded-full" />}
                                </div>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${member.color}`}>
                                    {member.initials}
                                </div>
                                <span className={`text-xs font-bold ${member.checked ? 'text-slate-900' : 'text-slate-400'}`}>{member.name}</span>
                            </div>
                        ))}
                    </FilterSection>

                    <FilterSection title="Status Legend">
                        <div className="space-y-2">
                            {Object.entries(STATUS_CONFIG).filter(([k]) => !['paid', 'cancelled'].includes(k)).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${v.dot}`} />
                                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{v.label}</span>
                                </div>
                            ))}
                        </div>
                    </FilterSection>
                </div>
            </aside>

            {/* MAIN */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between px-6 bg-white dark:bg-slate-800 dark:bg-slate-800 z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setCurrentDate(new Date()); setViewType('week'); }}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                            Today
                        </button>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button onClick={handlePrev} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600 dark:text-slate-300"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={handleNext} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600 dark:text-slate-300"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                        <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {format(viewStart, 'MMM d')} - {format(viewEnd, 'MMM d, yyyy')}
                        </span>
                        <div className="relative">
                            <button onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest">
                                {viewType} <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isViewDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isViewDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-28 bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 py-1 z-50">
                                    {(['day', 'week', 'month'] as const).map(t => (
                                        <button key={t} onClick={() => { setViewType(t); setIsViewDropdownOpen(false); }}
                                            className={`w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 ${viewType === t ? 'text-indigo-600' : 'text-slate-500'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsModalOpen(true)}
                            className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95">
                            <Plus className="w-4 h-4" /> New Appt
                        </button>
                        <div className="h-6 w-px bg-slate-200" />
                        <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all"><Filter className="w-5 h-5" /></button>
                        <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all"><Settings className="w-5 h-5" /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-900/50 relative">
                    {dbLoading && (
                        <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing</span>
                            </div>
                        </div>
                    )}

                    <div className="flex border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 dark:bg-slate-800 pl-14">
                        {viewDays.map((day, i) => {
                            const isCurrent = isToday(day);
                            const isSelected = isSameDay(day, currentDate);
                            // FIX: use getApptDate() to count appointments per day
                            const dayApptCount = appointments.filter(a => {
                                const d = getApptDate(a);
                                return d ? isSameDay(d, day) : false;
                            }).length;
                            return (
                                <div key={i} onClick={() => { setCurrentDate(day); if (viewType === 'week') setViewType('day'); }}
                                    className={`flex-1 py-3 text-center border-r border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                                    <span className={`text-[10px] uppercase font-black tracking-widest block mb-1 ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {format(day, 'EEE')}
                                    </span>
                                    <span className={`text-xl font-black rounded-full w-9 h-9 inline-flex items-center justify-center transition-all ${isCurrent ? 'bg-indigo-600 text-white' : isSelected ? 'text-indigo-600' : 'text-slate-900'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayApptCount > 0 && (
                                        <div className="text-[9px] font-black text-indigo-500 mt-1">{dayApptCount} appt{dayApptCount > 1 ? 's' : ''}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto flex relative min-h-0">
                        <div className="w-14 flex-shrink-0 border-r border-slate-100 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-800 dark:bg-slate-800 relative sticky left-0 z-20" style={{ minHeight: `${HOURS.length * SLOT_HEIGHT}px` }}>
                            {HOURS.map((hour, i) => {
                                const isOff = hour < WORKING_START || hour >= WORKING_END;
                                const top = i * SLOT_HEIGHT;
                                return (
                                    <div key={i} style={{ top: `${top}px` }} className={`absolute w-full flex justify-center ${isOff ? 'text-slate-300' : 'text-slate-400'}`}>
                                        <span className="absolute -top-2.5 text-[10px] font-black bg-white dark:bg-slate-800 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 leading-none z-10">{format(new Date().setHours(hour, 0, 0, 0), 'h a')}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex-1 flex relative" style={{ minHeight: `${HOURS.length * SLOT_HEIGHT}px` }}>
                            <div className="absolute inset-0 z-0 pointer-events-none">
                                {HOURS.map((hour, i) => {
                                    const isOff = hour < WORKING_START || hour >= WORKING_END;
                                    const top = i * SLOT_HEIGHT;
                                    return (
                                        <div key={i} style={{ top: `${top}px`, height: `${SLOT_HEIGHT}px` }} className={`absolute w-full border-t ${isOff ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800' : 'border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800'}`} />
                                    );
                                })}
                            </div>

                            {viewDays.map((day, colIndex) => {
                                const isSelected = isSameDay(day, currentDate);
                                // FIX: Use getApptDate() to filter appointments for this day column
                                const dayAppts = appointments.filter(a => {
                                    const d = getApptDate(a);
                                    return d ? isSameDay(d, day) : false;
                                });
                                const dayBlocks = availability.filter(b => {
                                    const bDate = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime || 0);
                                    return isSameDay(bDate, day);
                                });
                                const hasAppts = dayAppts.length > 0;

                                return (
                                    <div key={colIndex}
                                        className={`flex-1 border-r border-slate-100 dark:border-slate-700 relative h-full z-10 ${isSelected ? 'bg-indigo-50/10' : ''}`}>

                                        <div className="absolute inset-0 z-0">
                                            {HOURS.map((hour, i) => {
                                                const isOff = hour < WORKING_START || hour >= WORKING_END;
                                                const isBlocked = dayBlocks.find(b => {
                                                    const bDate = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime || 0);
                                                    return bDate.getHours() === hour;
                                                });
                                                const top = i * SLOT_HEIGHT;
                                                return (
                                                    <div key={i}
                                                        style={{ top: `${top}px`, height: `${SLOT_HEIGHT}px` }}
                                                        className={`absolute w-full border-t border-transparent group/slot ${isOff ? '' : 'hover:bg-indigo-50/30'} ${isBlocked ? 'cursor-not-allowed' : 'cursor-crosshair'} transition-colors`}
                                                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                        onDrop={e => handleDrop(e, day, hour)}
                                                        onClick={() => !isBlocked && !isOff && handleBlockTime(day, hour)}
                                                    >
                                                        {!isBlocked && !isOff && (
                                                            <div className="absolute inset-0 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center pointer-events-none">
                                                                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">+ Block</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {!hasAppts && !dayBlocks.length && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest rotate-90">No appointments</span>
                                            </div>
                                        )}

                                        {dayBlocks.map(block => {
                                            const bDate = block.startTime?.toDate ? block.startTime.toDate() : new Date(block.startTime || 0);
                                            const bTop = ((bDate.getHours() - 7) * SLOT_HEIGHT);
                                            return (
                                                <div key={block.id}
                                                    style={{
                                                        top: `${bTop}px`, height: `${SLOT_HEIGHT}px`,
                                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)',
                                                        position: 'absolute', left: 4, right: 4, zIndex: 10
                                                    }}
                                                    className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-50/80">
                                                    <div className="flex items-center justify-between px-2 pt-2">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Blocked</span>
                                                        <button onClick={(e) => { e.stopPropagation(); unblockTime(block.id); }}
                                                            className="p-0.5 hover:bg-slate-200 rounded text-slate-300 hover:text-red-400 transition-colors">
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {isToday(day) && (() => {
                                            const now = new Date();
                                            const top = ((now.getHours() - 7) * SLOT_HEIGHT) + ((now.getMinutes() / 60) * SLOT_HEIGHT);
                                            return (
                                                <div className="absolute w-full z-20 pointer-events-none" style={{ top }}>
                                                    <div className="border-t-2 border-red-400 relative">
                                                        <div className="w-3 h-3 bg-red-500 rounded-full -mt-1.5 -ml-1" />
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {dayAppts.map(appt => (
                                            <AppointmentCard
                                                key={appt.id}
                                                appt={appt}
                                                style={getApptStyle(appt)}
                                                onClickCard={setSelectedAppt}
                                                onStatusChange={handleStatusChange}
                                                onDragStart={handleDragStart}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FilterSection({ title, children, defaultOpen = false }: any) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-slate-50 last:border-0 pb-3">
            <button onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full py-2 text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <ChevronDown className={`w-3 h-3 text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </div>
    );
}
