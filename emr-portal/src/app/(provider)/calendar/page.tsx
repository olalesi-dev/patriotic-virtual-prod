"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, ChevronDown, Plus, Filter, Settings,
    Calendar as CalendarIcon, User, Search, Video, Clock, FileText,
    MapPin, X, CheckCircle2, AlertTriangle, RefreshCw, MessageSquare,
    Phone, MoreVertical, Repeat, Check, UserX, ArrowRight
} from 'lucide-react';
import {
    format, addWeeks, subWeeks, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameDay, isToday, addDays, subDays,
    startOfMonth, endOfMonth, startOfDay, endOfDay, addMonths, subMonths, isWithinInterval
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
    collection, onSnapshot, query, orderBy, addDoc, getDocs,
    limit, where, updateDoc, doc, Timestamp
} from 'firebase/firestore';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM → 7 PM
const WORKING_START = 8;
const WORKING_END = 18;
const SLOT_HEIGHT = 80; // px per hour

const STATUS_CONFIG: Record<string, { label: string; dot: string; border: string; bg: string }> = {
    confirmed: { label: 'Confirmed', dot: 'bg-blue-500', border: 'border-blue-500', bg: 'bg-blue-50' },
    pending: { label: 'Pending', dot: 'bg-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-50' },
    paid: { label: 'Confirmed', dot: 'bg-blue-500', border: 'border-blue-500', bg: 'bg-blue-50' },
    checked_in: { label: 'Checked In', dot: 'bg-emerald-500', border: 'border-emerald-500', bg: 'bg-emerald-50' },
    no_show: { label: 'No-Show', dot: 'bg-red-500', border: 'border-red-500', bg: 'bg-red-50' },
    completed: { label: 'Completed', dot: 'bg-slate-400', border: 'border-slate-400', bg: 'bg-slate-50' },
    cancelled: { label: 'Cancelled', dot: 'bg-slate-400', border: 'border-slate-400', bg: 'bg-slate-50' },
};

const TYPE_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; badge: string }> = {
    video: { label: 'VIDEO', border: 'border-cyan-500', bg: 'bg-cyan-50/90', text: 'text-cyan-900', badge: 'bg-cyan-100 text-cyan-700' },
    telehealth: { label: 'VIDEO', border: 'border-cyan-500', bg: 'bg-cyan-50/90', text: 'text-cyan-900', badge: 'bg-cyan-100 text-cyan-700' },
    'in-person': { label: 'IN-PERSON', border: 'border-emerald-500', bg: 'bg-emerald-50/90', text: 'text-emerald-900', badge: '' },
    initial: { label: 'INITIAL', border: 'border-violet-500', bg: 'bg-violet-50/90', text: 'text-violet-900', badge: '' },
    followup: { label: 'FOLLOW-UP', border: 'border-amber-500', bg: 'bg-amber-50/90', text: 'text-amber-900', badge: '' },
};

function getTypeConfig(appt: any) {
    const t = (appt.type || '').toLowerCase();
    const s = (appt.service || '').toLowerCase();
    if (t === 'video' || t === 'telehealth') return TYPE_CONFIG.video;
    if (t === 'in-person') return TYPE_CONFIG['in-person'];
    if (s.includes('initial') || s.includes('consultation')) return TYPE_CONFIG.initial;
    if (s.includes('follow')) return TYPE_CONFIG.followup;
    return TYPE_CONFIG.video; // default
}

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

function isJoinActive(appt: any): boolean {
    const type = (appt.type || '').toLowerCase();
    if (type !== 'video' && type !== 'telehealth') return false;
    if (!appt.date || !appt.time) return false;
    const apptTime = new Date(`${appt.date}T${appt.time}:00`);
    const now = new Date();
    const diffMs = apptTime.getTime() - now.getTime();
    return diffMs <= 10 * 60 * 1000 && diffMs > -60 * 60 * 1000; // 10 min before to 1hr after
}

function getPatientLabel(appt: any) {
    const name = appt.patientName || appt.patient || '';
    if (!name || name.trim() === '' || name.toLowerCase() === 'unknown' || name.toLowerCase() === 'unknown patient') {
        const id = appt.patientId || appt.id || '';
        return { name: `Patient #${id.slice(0, 6)}`, isFallback: true };
    }
    return { name, isFallback: false };
}

// ─── APPOINTMENT CARD ────────────────────────────────────────────────────────

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
            {/* Status dot + patient name */}
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

            {/* Service / visit type */}
            <div className="text-[10px] font-semibold opacity-60 truncate mb-1.5">
                {appt.service || appt.type || 'Consultation'}
            </div>

            {/* Time + VIDEO badge */}
            <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold opacity-70">{appt.time}</span>
                {isVideo && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider ${typeConf.badge}`}>
                        VIDEO
                    </span>
                )}
            </div>

            {/* Join button for video */}
            {isVideo && (
                <div className="mt-1.5" title={joinActive ? 'Join Telehealth Visit' : 'Available 10 min before appointment'}>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (joinActive) alert('Joining...'); }}
                        disabled={!joinActive}
                        className={`w-full text-[9px] font-black rounded-lg py-1 transition-all ${joinActive
                            ? 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm shadow-cyan-300'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        {joinActive ? '▶ JOIN NOW' : '🔒 JOIN'}
                    </button>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed', zIndex: 9999 }}
                    className="bg-white rounded-xl shadow-2xl border border-slate-100 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    {['confirmed', 'checked_in', 'no_show', 'completed', 'cancelled'].map(s => (
                        <button
                            key={s}
                            onClick={() => { onStatusChange(appt.id, s); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2"
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

// ─── SLIDE-OUT PANEL ─────────────────────────────────────────────────────────

function SlideOutPanel({ appt, onClose, onStatusChange }: {
    appt: any | null;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
}) {
    if (!appt) return null;
    const { name, isFallback } = getPatientLabel(appt);
    const typeConf = getTypeConfig(appt);
    const statusConf = getStatusConfig(appt.status);
    const joinActive = isJoinActive(appt);
    const isVideo = (appt.type || '').toLowerCase() === 'video' || (appt.type || '').toLowerCase() === 'telehealth';

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={onClose} />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className={`p-5 border-b border-slate-100 ${typeConf.bg} border-l-4 ${typeConf.border}`}>
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
                                <h2 className="text-xl font-black text-slate-900">{name}</h2>
                            )}
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                {appt.service || appt.type || 'Consultation'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Details */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <DetailRow icon={<Clock size={14} />} label="Time" value={`${appt.time} — ${appt.date}`} />
                    <DetailRow icon={<User size={14} />} label="Provider" value={appt.providerName || appt.doctor || '—'} />
                    <DetailRow icon={<FileText size={14} />} label="Visit Reason" value={appt.notes || appt.service || '—'} />
                    {appt.patientId && <DetailRow icon={<User size={14} />} label="Patient ID" value={appt.patientId.slice(0, 12)} />}

                    {/* Status quick-update */}
                    <div>
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

                {/* Actions */}
                <div className="p-5 border-t border-slate-100 space-y-2">
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
                        <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600">
                            <MessageSquare size={13} /> Message
                        </button>
                        <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600">
                            <RefreshCw size={13} /> Reschedule
                        </button>
                    </div>
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
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

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

    // ─── REALTIME SYNC ────────────────────────────────────────────────────────

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

    // ─── VIEW LOGIC ───────────────────────────────────────────────────────────

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

    // ─── APPOINTMENT STYLE (position) ────────────────────────────────────────

    const getApptStyle = (appt: any): React.CSSProperties => {
        const dateStr = appt.date || '';
        const timeStr = appt.time || '09:00';
        const dt = new Date(`${dateStr}T${timeStr}:00`);
        const top = ((dt.getHours() - 7) * SLOT_HEIGHT) + ((dt.getMinutes() / 60) * SLOT_HEIGHT);
        return { position: 'absolute', top: `${top}px`, height: `${SLOT_HEIGHT}px`, left: 4, right: 4 };
    };

    // ─── STATUS UPDATE ─────────────────────────────────────────────────────

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await updateDoc(doc(db, 'appointments', id), { status, updatedAt: Timestamp.now() });
            if (selectedAppt?.id === id) setSelectedAppt((prev: any) => ({ ...prev, status }));
            showToast(`Status updated to "${STATUS_CONFIG[status]?.label}"`);
        } catch (e) { showToast('Failed to update status.'); }
    };

    // ─── DRAG & DROP ─────────────────────────────────────────────────────────

    const handleDragStart = (e: React.DragEvent, appt: any) => {
        setDraggedAppt(appt);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, day: Date, hour: number) => {
        e.preventDefault();
        if (!draggedAppt) return;

        // Snap to 15-minute intervals based on drop position within cell
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const minuteOffset = Math.round((relY / SLOT_HEIGHT) * 60 / 15) * 15;
        const newTime = `${hour.toString().padStart(2, '0')}:${minuteOffset.toString().padStart(2, '0')}`;
        const newDate = format(day, 'yyyy-MM-dd');
        const newStart = new Date(`${newDate}T${newTime}:00`);

        try {
            await updateDoc(doc(db, 'appointments', draggedAppt.id), {
                date: newDate, time: newTime,
                startTime: Timestamp.fromDate(newStart),
                updatedAt: Timestamp.now()
            });
            showToast(`Appointment rescheduled to ${format(day, 'EEE MMM d')} at ${newTime}`);
        } catch (e) { showToast('Reschedule failed.'); }
        setDraggedAppt(null);
    };

    // ─── BLOCK TIME ──────────────────────────────────────────────────────────

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

    // ─── ADD APPOINTMENT ──────────────────────────────────────────────────────

    const handleScheduleVisit = async () => {
        if (!apptForm.patientName) { alert('Please select a patient.'); return; }
        try {
            const startDate = new Date(`${apptForm.date}T${apptForm.time}:00`);
            await addDoc(collection(db, 'appointments'), {
                patient: apptForm.patientName, patientName: apptForm.patientName,
                date: apptForm.date, time: apptForm.time,
                startTime: Timestamp.fromDate(startDate),
                type: apptForm.type, notes: apptForm.notes,
                status: 'confirmed',
                providerId: teamMembers[0]?.id || '',
                providerName: teamMembers[0]?.name || 'Provider',
                doctor: teamMembers[0]?.name || 'Provider',
                service: apptForm.type === 'video' ? 'Follow-up (Video)' : 'Initial Consultation'
            });
            setIsModalOpen(false);
            setApptForm({ patientName: '', date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', type: 'video', notes: '' });
            showToast('Appointment scheduled!');
        } catch (e) { showToast('Failed to schedule visit.'); }
    };

    const toggleTeamMember = (id: string) =>
        setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, checked: !m.checked } : m));

    const allSelected = teamMembers.every(m => m.checked);

    const currentWeekRange = { start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) };

    // ─── RENDER ───────────────────────────────────────────────────────────────

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans relative">

            {/* TOAST */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" /> {toast}
                </div>
            )}

            {/* SLIDE OUT PANEL */}
            <SlideOutPanel appt={selectedAppt} onClose={() => setSelectedAppt(null)} onStatusChange={handleStatusChange} />

            {/* APPOINTMENT MODAL */}
            {isModalOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="bg-indigo-600 p-6 text-white">
                            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold mb-1">New Telehealth Visit</h2>
                            <p className="text-indigo-100 text-sm">Schedule a visit with a patient.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Patient</label>
                                <select value={apptForm.patientName} onChange={e => setApptForm({ ...apptForm, patientName: e.target.value })}
                                    className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                                    <option value="" disabled>Select patient...</option>
                                    {patients.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Date</label>
                                    <input type="date" value={apptForm.date} onChange={e => setApptForm({ ...apptForm, date: e.target.value })}
                                        className="w-full h-11 pl-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Time</label>
                                    <input type="time" value={apptForm.time} onChange={e => setApptForm({ ...apptForm, time: e.target.value })}
                                        className="w-full h-11 pl-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Visit Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['video', 'in-person'].map(t => (
                                        <button key={t} onClick={() => setApptForm({ ...apptForm, type: t })}
                                            className={`h-11 rounded-xl border-2 font-bold text-sm transition-all ${apptForm.type === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}>
                                            {t === 'video' ? '📹 Video' : '🏥 In-Person'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Notes</label>
                                <textarea placeholder="Reason for visit..." value={apptForm.notes}
                                    onChange={e => setApptForm({ ...apptForm, notes: e.target.value })}
                                    className="w-full p-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px] resize-none" />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
                            <button onClick={handleScheduleVisit}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                                Schedule Visit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <aside className="w-60 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">

                {/* Mini Calendar */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-slate-900">{format(currentDate, 'MMMM yyyy')}</span>
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

                {/* Filters */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <FilterSection title="Team Members" defaultOpen>
                        <div onClick={() => teamMembers.forEach(m => setTeamMembers(prev => prev.map(x => ({ ...x, checked: !allSelected }))))}
                            className="flex items-center gap-3 mb-3 cursor-pointer">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                {allSelected && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-xs font-bold text-slate-600">All team members</span>
                        </div>
                        {teamMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-3 mb-2.5 cursor-pointer" onClick={() => toggleTeamMember(member.id)}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${member.checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                                    {member.checked && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
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
                                    <span className="text-xs text-slate-600 font-medium">{v.label}</span>
                                </div>
                            ))}
                        </div>
                    </FilterSection>
                </div>
            </aside>

            {/* MAIN */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* TOOLBAR */}
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setCurrentDate(new Date()); setViewType('week'); }}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                            Today
                        </button>
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                            <button onClick={handlePrev} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={handleNext} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                        <span className="text-lg font-black text-slate-900 tracking-tight">
                            {format(viewStart, 'MMM d')} – {format(viewEnd, 'MMM d, yyyy')}
                        </span>
                        <div className="relative">
                            <button onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-1.5 border border-slate-200 rounded-xl text-sm font-black text-slate-700 hover:bg-slate-50 transition-all uppercase tracking-widest">
                                {viewType} <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isViewDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isViewDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-28 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
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

                {/* GRID */}
                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 relative">
                    {dbLoading && (
                        <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing</span>
                            </div>
                        </div>
                    )}

                    {/* Day header row */}
                    <div className="flex border-b border-slate-200 shrink-0 bg-white pl-14">
                        {viewDays.map((day, i) => {
                            const isCurrent = isToday(day);
                            const isSelected = isSameDay(day, currentDate);
                            const dayApptCount = appointments.filter(a => isSameDay(new Date((a.date || '') + 'T00:00:00'), day)).length;
                            return (
                                <div key={i} onClick={() => { setCurrentDate(day); if (viewType === 'week') setViewType('day'); }}
                                    className={`flex-1 py-3 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}>
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

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto flex relative min-h-0">

                        {/* Time column */}
                        <div className="w-14 flex-shrink-0 border-r border-slate-100 bg-white relative sticky left-0 z-20" style={{ minHeight: `${HOURS.length * SLOT_HEIGHT}px` }}>
                            {HOURS.map((hour, i) => {
                                const isOff = hour < WORKING_START || hour >= WORKING_END;
                                const top = i * SLOT_HEIGHT;
                                return (
                                    <div key={i} style={{ top: `${top}px` }} className={`absolute w-full flex justify-center ${isOff ? 'text-slate-300' : 'text-slate-400'}`}>
                                        <span className="absolute -top-2.5 text-[10px] font-black bg-white px-1 leading-none z-10">{format(new Date().setHours(hour, 0, 0, 0), 'h a')}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Columns */}
                        <div className="flex-1 flex relative" style={{ minHeight: `${HOURS.length * SLOT_HEIGHT}px` }}>
                            {/* Hour lines */}
                            <div className="absolute inset-0 z-0 pointer-events-none">
                                {HOURS.map((hour, i) => {
                                    const isOff = hour < WORKING_START || hour >= WORKING_END;
                                    const top = i * SLOT_HEIGHT;
                                    return (
                                        <div key={i} style={{ top: `${top}px`, height: `${SLOT_HEIGHT}px` }} className={`absolute w-full border-t ${isOff ? 'bg-slate-50/80 border-slate-100' : 'border-slate-100 bg-white'}`} />
                                    );
                                })}
                            </div>

                            {viewDays.map((day, colIndex) => {
                                const isSelected = isSameDay(day, currentDate);
                                const dayAppts = appointments.filter(a =>
                                    isSameDay(new Date((a.date || '') + 'T00:00:00'), day));
                                const dayBlocks = availability.filter(b => {
                                    const bDate = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime || 0);
                                    return isSameDay(bDate, day);
                                });
                                const hasAppts = dayAppts.length > 0;

                                return (
                                    <div key={colIndex}
                                        className={`flex-1 border-r border-slate-100 relative h-full z-10 ${isSelected ? 'bg-indigo-50/10' : ''}`}>

                                        {/* Droppable hour slots */}
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

                                        {/* Empty state */}
                                        {!hasAppts && !dayBlocks.length && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest rotate-90">No appointments</span>
                                            </div>
                                        )}

                                        {/* Blocked slots */}
                                        {dayBlocks.map(block => {
                                            const bDate = block.startTime?.toDate ? block.startTime.toDate() : new Date(block.startTime || 0);
                                            const bTop = ((bDate.getHours() - 7) * SLOT_HEIGHT);
                                            return (
                                                <div key={block.id}
                                                    style={{
                                                        top: `${bTop}px`,
                                                        height: `${SLOT_HEIGHT}px`,
                                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)',
                                                        position: 'absolute',
                                                        left: 4, right: 4,
                                                        zIndex: 10
                                                    }}
                                                    className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50/80">
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

                                        {/* Today line */}
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

                                        {/* Appointment cards */}
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

// ─── FILTER SECTION ──────────────────────────────────────────────────────────

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
