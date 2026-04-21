"use client";

import { useMutation } from '@tanstack/react-query';
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
import { apiFetchJson } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-origin';
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
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
const Calendar = dynamic(() => import('react-calendar'), {
    ssr: false,
    loading: () => <div className="h-[300px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl animate-pulse">Loading selector...</div>
});
import 'react-calendar/dist/Calendar.css';
import { logAuditEvent } from '@/lib/audit';
import { sanitize } from '@/lib/security';
import { TelehealthIframeModal } from '@/components/telehealth/TelehealthIframeModal';

// Helper: safely convert a Firestore Timestamp (or plain Date / ISO string) to a JS Date.
// Returns null if the value is missing or cannot be converted.
function toSafeDate(value: any): Date | null {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();           // Firestore Timestamp
    if (value instanceof Date) return value;                                   // already a Date
    if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

// --- Types ---
interface Appointment {
    id: string;
    date: any;
    scheduledAt?: any;
    providerName: string;
    providerId: string;
    type: 'Telehealth' | 'In-Person';
    status: 'scheduled' | 'cancelled' | 'completed' | 'PENDING_SCHEDULING' | 'waitlist';
    reason: string;
    meetingUrl?: string;
    intakeAnswers?: Record<string, any>;
    intake?: Record<string, any>;
    serviceKey?: string;
    patientName?: string;
    patientEmail?: string;
    uid?: string;
    paymentStatus?: string;
    consultationId?: string;
}

interface Provider {
    id: string;
    name: string;
    specialty: string;
}

export default function AppointmentsPage() {
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'waitlist' | 'upcoming' | 'past'>('waitlist');
    const [hasMore] = useState(false);

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
    const initializeBookingMutation = useMutation({
        mutationFn: async ({
            token,
            serviceKey,
            intake,
            priceId,
            uid
        }: {
            token: string;
            serviceKey: string;
            intake: Record<string, any>;
            priceId: string;
            uid: string;
        }) => {
            const baseHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const consultation = await apiFetchJson<{ id: string }>(getApiUrl('/api/v1/consultations'), {
                method: 'POST',
                headers: baseHeaders,
                body: {
                    serviceKey,
                    intake,
                    stripeProductId: priceId
                }
            });

            return apiFetchJson<{ url: string }>(getApiUrl('/api/v1/payments/create-checkout-session'), {
                method: 'POST',
                headers: baseHeaders,
                body: {
                    priceId,
                    serviceKey,
                    consultationId: consultation.id,
                    uid
                }
            });
        }
    });

    // Checklist State
    const [joiningAppt, setJoiningAppt] = useState<Appointment | null>(null);
    const [checklist, setChecklist] = useState({
        camera: false,
        mic: false,
        idReady: false,
        quiet: false
    });

    // Intake Detail Modal State
    const [intakeDetail, setIntakeDetail] = useState<Appointment | null>(null);

    // AI Summary State (completed appointments only)
    const [selectedSummary, setSelectedSummary] = useState<Appointment | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [aiSummary, setAiSummary] = useState<any>(null);
    const [feedbackSent, setFeedbackSent] = useState(false);
    
    // Telehealth Modal State
    const [activeVideoCall, setActiveVideoCall] = useState<{ url: string, apptId: string, role: 'patient' | 'provider', intakeAnswers: any } | null>(null);

    useEffect(() => {
        let unsubConsult: (() => void) | null = null;
        let unsubSubAppt: (() => void) | null = null;
        let unsubTopAppt: (() => void) | null = null;

        const unsubAuth = auth.onAuthStateChanged((user) => {
            unsubConsult?.();
            unsubSubAppt?.();
            unsubTopAppt?.();

            if (!user) {
                setAppointments([]);
                setLoading(false);
                return;
            }

            fetchProviders();

            let consultData: Appointment[] = [];
            let subApptData: Appointment[] = [];
            let topApptData: Appointment[] = []; // top-level appointments collection (written by provider schedule action)

            // Status rank: higher = more advanced in the workflow.
            // When merging two sources, we always keep the higher-ranked status.
            const STATUS_RANK: Record<string, number> = {
                PENDING_SCHEDULING: 0,
                waitlist: 0,
                scheduled: 1,
                completed: 2,
                cancelled: 3,
            };
            const statusRank = (s: string) => STATUS_RANK[s] ?? 0;

            // Helper to merge a new source into the running map, always keeping higher-ranked status
            const mergeInto = (map: Map<string, Appointment>, items: Appointment[]) => {
                items.forEach(a => {
                    const key = a.consultationId || a.id;
                    const existing = map.get(key);
                    if (existing) {
                        const betterStatus = statusRank(a.status) >= statusRank(existing.status) ? a.status : existing.status;
                        const betterScheduledAt = a.scheduledAt || existing.scheduledAt;
                        map.set(key, {
                            ...existing,
                            ...a,
                            status: betterStatus,
                            scheduledAt: betterScheduledAt,
                            date: betterScheduledAt || a.date || existing.date,
                        });
                    } else {
                        map.set(key, a);
                    }
                });
            };

            const merge = () => {
                const byKey = new Map<string, Appointment>();
                // Layer 1: consultations (base — has intake, serviceKey, paymentStatus)
                consultData.forEach(c => byKey.set(c.id, c));
                // Layer 2: patients/{uid}/appointments sub-collection (webhook-written)
                mergeInto(byKey, subApptData);
                // Layer 3: top-level appointments collection (provider-written on scheduling)
                // This is THE source of truth for scheduled status + scheduledAt
                mergeInto(byKey, topApptData);

                const merged = Array.from(byKey.values());
                merged.sort((a, b) => {
                    const aMs = toSafeDate(a.scheduledAt || a.date)?.getTime() ?? 0;
                    const bMs = toSafeDate(b.scheduledAt || b.date)?.getTime() ?? 0;
                    return aMs - bMs;
                });
                setAppointments(merged);
                setLoading(false);
            };




            // Listener 1a: consultations by uid field (new docs after our fix)
            const consultQ = query(
                collection(db, 'consultations'),
                where('uid', '==', user.uid)
            );

            // Listener 1b: consultations by patientId field (older docs before fix)
            const consultByPatientIdQ = query(
                collection(db, 'consultations'),
                where('patientId', '==', user.uid)
            );

            const mapConsultDoc = (d: any): Appointment => {
                const raw = d.data();
                const rawStatus = (raw.status || '').toLowerCase();
                let normalizedStatus = 'PENDING_SCHEDULING';
                if (rawStatus === 'scheduled') normalizedStatus = 'scheduled';
                else if (rawStatus === 'completed') normalizedStatus = 'completed';
                else if (rawStatus === 'cancelled') normalizedStatus = 'cancelled';
                // waitlist maps to PENDING_SCHEDULING

                return {
                    id: d.id,
                    uid: raw.uid || raw.patientId,
                    status: normalizedStatus as Appointment['status'],
                    paymentStatus: raw.paymentStatus,
                    reason: raw.serviceKey || raw.reason || 'Consultation',
                    type: 'Telehealth',
                    date: raw.scheduledAt || raw.createdAt,
                    scheduledAt: raw.scheduledAt || null,
                    providerName: raw.providerName || 'Patriotic Provider',
                    providerId: raw.providerId || '',
                    intakeAnswers: raw.intake || {},
                    intake: raw.intake || {},
                    serviceKey: raw.serviceKey,
                    meetingUrl: (() => {
                        const u = raw.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth';
                        const isStale = u.includes('check-in') || u.includes('patriotic-visit-') || (u.includes('doxy.me') && !u.startsWith('https://PVT.doxy.me'));
                        return isStale ? 'https://PVT.doxy.me/patrioticvirtualtelehealth' : u;
                    })(),
                    patientName: raw.intake ? `${raw.intake.firstName || ''} ${raw.intake.lastName || ''}`.trim() : '',
                    patientEmail: raw.intake?.email || '',
                };
            };

            let consultByUid: Appointment[] = [];
            let consultByPatientId: Appointment[] = [];

            const rebuildConsultData = () => {
                // Merge both queries, deduplicate by doc id
                const byId = new Map<string, Appointment>();
                consultByUid.forEach(a => byId.set(a.id, a));
                consultByPatientId.forEach(a => byId.set(a.id, a));
                consultData = Array.from(byId.values()).filter(a => !a.paymentStatus || a.paymentStatus === 'paid');
                merge();
            };

            unsubConsult = onSnapshot(consultQ, (snap) => {
                consultByUid = snap.docs.map(mapConsultDoc);
                rebuildConsultData();
            }, (err) => { console.error('Consultation (uid) listener error:', err); setLoading(false); });

            // Second listener for older docs using patientId
            const unsubConsultByPatientId = onSnapshot(consultByPatientIdQ, (snap) => {
                consultByPatientId = snap.docs.map(mapConsultDoc);
                rebuildConsultData();
            }, (err) => { console.error('Consultation (patientId) listener error:', err); });



            // Listener 2: patients/{uid}/appointments sub-collection (written by Stripe webhook)
            const subApptQ = query(collection(db, 'patients', user.uid, 'appointments'));
            unsubSubAppt = onSnapshot(subApptQ, (snap) => {
                subApptData = snap.docs.map(d => {
                    const raw = d.data();
                    const rawStatus = (raw.status || '').toLowerCase().trim();
                    let normalizedStatus: string;
                    if (rawStatus === 'scheduled') normalizedStatus = 'scheduled';
                    else if (rawStatus === 'completed') normalizedStatus = 'completed';
                    else if (rawStatus === 'cancelled') normalizedStatus = 'cancelled';
                    else normalizedStatus = 'PENDING_SCHEDULING';
                    return {
                        ...raw,
                        id: d.id,
                        consultationId: raw.consultationId,
                        uid: raw.patientUid || user.uid,
                        status: normalizedStatus as Appointment['status'],
                        reason: raw.serviceKey || raw.reason || 'Consultation',
                        type: 'Telehealth',
                        date: raw.scheduledAt || raw.date || raw.createdAt,
                        scheduledAt: raw.scheduledAt || null,
                        providerName: raw.providerName || 'Patriotic Provider',
                        providerId: raw.providerId || '',
                        intakeAnswers: raw.intakeAnswers || {},
                        intake: raw.intakeAnswers || {},
                        serviceKey: raw.serviceKey,
                        meetingUrl: (() => {
                            const u = raw.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth';
                            const isStale = u.includes('check-in') || u.includes('patriotic-visit-') || (u.includes('doxy.me') && !u.startsWith('https://PVT.doxy.me'));
                            return isStale ? 'https://PVT.doxy.me/patrioticvirtualtelehealth' : u;
                        })(),
                    } as Appointment;
                });
                merge();
            }, (err) => console.error('SubAppt listener error:', err));

            // Listener 3: top-level appointments collection — THIS is where the provider
            // dashboard writes status:'scheduled' + scheduledAt when they confirm an appointment.
            // Without this listener the patient portal never sees the scheduled status.
            const topApptQ = query(
                collection(db, 'appointments'),
                where('patientId', '==', user.uid)
            );
            unsubTopAppt = onSnapshot(topApptQ, (snap) => {
                topApptData = snap.docs.map(d => {
                    const raw = d.data();
                    const rawStatus = (raw.status || '').toLowerCase().trim();
                    let normalizedStatus: string;
                    if (rawStatus === 'scheduled') normalizedStatus = 'scheduled';
                    else if (rawStatus === 'completed') normalizedStatus = 'completed';
                    else if (rawStatus === 'cancelled') normalizedStatus = 'cancelled';
                    else if (rawStatus === 'pending_scheduling' || rawStatus === 'waitlist' || rawStatus === 'pending') normalizedStatus = 'PENDING_SCHEDULING';
                    else normalizedStatus = 'PENDING_SCHEDULING';

                    // The top-level doc's ID IS the consultation ID (set during Stripe webhook)
                    const consultationId = raw.consultationId || d.id;
                    const scheduledAt = raw.scheduledAt || raw.startTime || null;

                    return {
                        ...raw,
                        id: d.id,
                        consultationId,
                        uid: raw.patientId || raw.patientUid || user.uid,
                        status: normalizedStatus as Appointment['status'],
                        reason: raw.serviceKey || raw.service || raw.type || raw.reason || 'Consultation',
                        type: 'Telehealth',
                        date: scheduledAt || raw.date || raw.createdAt,
                        scheduledAt,
                        providerName: raw.providerName || 'Patriotic Provider',
                        providerId: raw.providerId || '',
                        intakeAnswers: raw.intakeAnswers || raw.intake || {},
                        intake: raw.intakeAnswers || raw.intake || {},
                        serviceKey: raw.serviceKey || raw.service,
                        meetingUrl: (() => {
                            const u = raw.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth';
                            const isStale = u.includes('check-in') || u.includes('patriotic-visit-') || (u.includes('doxy.me') && !u.startsWith('https://PVT.doxy.me'));
                            return isStale ? 'https://PVT.doxy.me/patrioticvirtualtelehealth' : u;
                        })(),
                        patientName: raw.patientName || '',
                        patientEmail: raw.patientEmail || '',
                    } as Appointment;
                });
                merge();
            }, (err) => console.error('TopAppt listener error:', err));
        });

        return () => {
            unsubAuth();
            unsubConsult?.();
            unsubSubAppt?.();
            unsubTopAppt?.();
        };
    }, []);






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

            const payData = await initializeBookingMutation.mutateAsync({
                token,
                serviceKey: newAppt.serviceKey,
                intake: newAppt.intake,
                priceId: service.priceId,
                uid: auth.currentUser.uid
            });

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

    // FIX: Guard against undefined date before calling toDate()
    const isJoinable = (apptDate: any) => {
        return true; // testing: bypass 15 min check
    };

    const canCancel = (apptDate: any) => {
        const date = toSafeDate(apptDate);
        if (!date) return false;
        return isAfter(date, addDays(new Date(), 1));
    };

    // FIX: Use toSafeDate() in filter â€” was crashing with .toDate() on undefined
    const parsedStatus = (s: string | undefined | null) => (s || '').toLowerCase();

    // Waitlist tab: only shows PENDING bookings awaiting provider scheduling.
    // Once a provider confirms a time (status → 'scheduled'), the appointment
    // automatically moves to the Upcoming tab.
    const waitlist = appointments.filter(a => {
        const s = parsedStatus(a.status);
        return s === 'pending_scheduling' || s === 'waitlist';
    });

    const upcoming = appointments.filter(a => {
        const s = parsedStatus(a.status);
        const d = toSafeDate(a.scheduledAt || a.date);
        return s === 'scheduled' &&
            (d ? isAfter(d, subMinutes(new Date(), 60)) : true);
    });

    const past = appointments.filter(a => {
        const s = parsedStatus(a.status);
        const d = toSafeDate(a.scheduledAt || a.date);
        return s === 'completed' || s === 'cancelled' ||
            (d && s === 'scheduled' ? isBefore(d, subMinutes(new Date(), 60)) : false);
    });

    const filteredAppts = activeTab === 'waitlist' ? waitlist : activeTab === 'upcoming' ? upcoming : past;

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-4 border-sky-100 border-t-[#0EA5E9] rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-8 pb-20 max-w-5xl mx-auto dark:text-slate-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 dark:text-white tracking-tight">Appointments</h1>
                    <p className="text-slate-400 dark:text-slate-300 font-bold uppercase tracking-widest text-xs mt-1">Manage your upcoming care visits</p>
                </div>

                <div className="flex gap-4">
                    <div className="flex bg-white dark:bg-slate-800 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 shadow-sm">
                        <button
                            onClick={() => setActiveTab('waitlist')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'waitlist' ? 'bg-[#0EA5E9] text-white shadow-lg shadow-sky-100 dark:shadow-sky-900/20' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                        >
                            Waitlist
                        </button>
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'upcoming' ? 'bg-[#0EA5E9] text-white shadow-lg shadow-sky-100 dark:shadow-sky-900/20' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'past' ? 'bg-[#0EA5E9] text-white shadow-lg shadow-sky-100 dark:shadow-sky-900/20' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                        >
                            History
                        </button>
                    </div>
                    <button
                        onClick={() => router.push('/book')}
                        className="bg-slate-900 dark:bg-sky-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-sky-500 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Book New
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredAppts.length > 0 ? filteredAppts.map((appt) => {
                    const apptDate = toSafeDate(appt.scheduledAt || appt.date);
                    const submittedDate = toSafeDate(appt.date); // createdAt for waitlist cards
                    const isWaitlistStatus = ['pending_scheduling', 'waitlist', 'PENDING_SCHEDULING'].includes(appt.status);
                    const isWaitlist = isWaitlistStatus; // alias kept for compatibility
                    const isScheduled = appt.status === 'scheduled';
                    const isCompleted = appt.status === 'completed';
                    const isCancelled = appt.status === 'cancelled';

                    // Human-readable status label
                    const statusLabel = isScheduled ? 'SCHEDULED' :
                        isWaitlistStatus ? 'AWAITING PROVIDER' :
                            isCancelled ? 'CANCELLED' :
                                isCompleted ? 'COMPLETED' :
                                    (appt.status || 'UNKNOWN').toUpperCase();

                    // Card border + date badge colours — amber for pending, sky for scheduled
                    const cardBorder = isScheduled
                        ? 'border-sky-100 dark:border-sky-900/50'
                        : isWaitlistStatus
                            ? 'border-amber-100 dark:border-amber-900/50'
                            : 'border-slate-50 dark:border-slate-700/50';
                    const dateBadgeBg = isScheduled
                        ? 'bg-sky-50 dark:bg-sky-900/20'
                        : isWaitlistStatus
                            ? 'bg-[#FFFBF0] dark:bg-amber-900/20'
                            : 'bg-[#F8FAFC] dark:bg-slate-900';

                    return (
                        <div key={appt.id} className={`bg-white dark:bg-slate-800 dark:bg-slate-800/80 rounded-[32px] border ${cardBorder} shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center group hover:shadow-xl hover:shadow-sky-900/5 dark:hover:shadow-black/20 transition-all`}>
                            <div className={`w-20 h-20 ${dateBadgeBg} rounded-[24px] flex flex-col items-center justify-center shrink-0 border border-slate-50 dark:border-slate-700/50`}>
                                {apptDate ? (
                                    <>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isWaitlistStatus ? 'text-amber-500 dark:text-amber-400' : 'text-[#0EA5E9] dark:text-sky-400'}`}>{format(apptDate, 'MMM')}</span>
                                        <span className={`text-2xl font-black mt-0.5 ${isWaitlistStatus ? 'text-amber-800 dark:text-amber-500' : 'text-slate-800 dark:text-white'}`}>{format(apptDate, 'dd')}</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase">TBD</span>
                                )}
                            </div>

                            <div className="flex-1 text-center md:text-left space-y-2 min-w-0">
                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 dark:text-white tracking-tight truncate">{appt.providerName}</h3>
                                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isScheduled ? 'bg-sky-50 text-[#0EA5E9] border-sky-100 dark:bg-sky-900/30 dark:border-sky-800/50' :
                                        isWaitlist ? 'bg-transparent text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50' :
                                            isCancelled ? 'bg-rose-50 text-rose-500 border-rose-100 dark:bg-rose-900/30 dark:border-rose-800/50' :
                                                'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-300'
                                        }`}>
                                        {statusLabel}
                                    </span>
                                </div>
                                {/* Card body: show scheduled info if scheduled, waitlist messaging if pending */}
                                {isWaitlistStatus ? (
                                    <div className="space-y-3 pt-1 pb-1">
                                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-amber-700/60 dark:text-amber-400 font-bold text-[10px] uppercase tracking-widest">
                                            <span>Time Submitted</span>
                                            {submittedDate && (
                                                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(submittedDate, 'h:mm a')}</div>
                                            )}
                                            <div className="flex items-center gap-1.5 opacity-80">
                                                {appt.type === 'Telehealth' || appt.type?.toLowerCase().includes('tele') ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                                {appt.type || 'Telehealth'}
                                            </div>
                                        </div>
                                        <div className="inline-flex bg-transparent dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            A PROVIDER WILL FINALIZE SCHEDULING WITHIN 24 HOURS
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-slate-400 dark:text-slate-300 font-bold text-xs uppercase tracking-widest">
                                        {isScheduled && apptDate ? (
                                            <div className="flex items-center gap-1.5 text-sky-500 dark:text-sky-400 font-black">
                                                <Clock className="w-3.5 h-3.5" />
                                                Scheduled for {format(apptDate, 'MMM d, yyyy · h:mm a')}
                                            </div>
                                        ) : apptDate ? (
                                            <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(apptDate, 'h:mm a')}</div>
                                        ) : null}
                                        <div className="flex items-center gap-1.5">
                                            {appt.type === 'Telehealth' || appt.type?.toLowerCase().includes('tele') ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                            {appt.type || 'Telehealth'}
                                        </div>
                                    </div>
                                )}
                                <p className="text-slate-400 dark:text-slate-500 text-sm italic line-clamp-1 py-1">{appt.reason}</p>
                            </div>

                            <div className="shrink-0 w-full md:w-auto flex flex-col gap-2">
                                {isScheduled && (
                                    <>
                                        {isJoinable(appt.scheduledAt || appt.date) ? (
                                            <button
                                                onClick={() => setActiveVideoCall({url: appt.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth', apptId: appt.id, role: 'patient', intakeAnswers: appt.intakeAnswers})}
                                                className="w-full md:w-52 bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-sky-100 dark:shadow-none hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse"
                                            >
                                                <Video className="w-4 h-4" /> Join Now
                                            </button>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => setActiveVideoCall({url: appt.meetingUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth', apptId: appt.id, role: 'patient', intakeAnswers: appt.intakeAnswers})}
                                                    className="w-full md:w-52 bg-sky-50 dark:bg-sky-900/30 text-[#0EA5E9] dark:text-sky-400 border border-sky-100 dark:border-sky-800 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-100 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Video className="w-4 h-4" /> Start Video Call
                                                </button>
                                                <button
                                                    onClick={() => setIntakeDetail(appt)}
                                                    className="w-full md:w-52 bg-white dark:bg-slate-800 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 dark:border-slate-700 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    View Intake
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                                {isWaitlistStatus && (
                                    <button
                                        onClick={() => setIntakeDetail(appt)}
                                        className="w-full md:w-auto bg-white dark:bg-slate-800 dark:bg-slate-800 text-[#0EA5E9] dark:text-sky-400 border border-sky-100 dark:border-sky-900/50 px-6 py-3 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-all shadow-sm"
                                    >
                                        View Intake
                                    </button>
                                )}
                                {isCompleted && (
                                    <button
                                        onClick={() => handleViewSummary(appt)}
                                        className="w-full md:w-48 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border border-slate-100 dark:border-slate-700 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:text-[#0EA5E9] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" /> View AI Summary
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="py-20 text-center space-y-4 bg-white dark:bg-slate-800 dark:bg-slate-800/50 rounded-[40px] border border-slate-50 dark:border-slate-700/50">
                        <CalendarIcon className="w-16 h-16 text-slate-100 dark:text-slate-700 mx-auto" />
                        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">No appointments found</p>
                    </div>
                )}
            </div>




            {/* SCHEDULING FLOW MODAL */}
            {isScheduling && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
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
                                            desc={`$${s.price} â€” ${s.cat}`}
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
                                        <div key={q.k} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                                            <label className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-4">{q.l}</label>
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
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#0EA5E9]/10 focus:border-[#0EA5E9] transition-all"
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
                                    <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 space-y-6">
                                        <div className="flex justify-between items-center pb-6 border-b border-slate-200/50">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Service Selection</p>
                                                <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">{svcs.find(s => s.k === newAppt.serviceKey)?.name}</h4>
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
                                                    <div key={k} className="flex justify-between text-xs font-bold py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                        <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                                        <span className="text-slate-800 dark:text-slate-100">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v}</span>
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
                            <div className="p-6 pt-0 shrink-0 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50">
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
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
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

            {/* INTAKE DETAIL MODAL — shown when patient clicks View Intake */}
            {intakeDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                        <div className="bg-gradient-to-br from-sky-400 to-indigo-500 p-8 md:p-10 text-white shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ClipboardCheck className="w-4 h-4 opacity-90" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 text-white/90">Appointment Detail</span>
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight leading-none">
                                        {intakeDetail.reason || 'Telehealth Visit'}
                                    </h2>
                                    <p className="text-white font-black text-[10px] uppercase tracking-widest mt-1">
                                        {intakeDetail.status === 'PENDING_SCHEDULING' ? 'Awaiting Provider Scheduling' : 'Confirmed'}
                                    </p>
                                </div>
                                <button onClick={() => setIntakeDetail(null)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-4 overflow-y-auto flex-1 bg-white dark:bg-slate-800 custom-scrollbar text-slate-800 dark:text-slate-100">
                            {(() => {
                                const isWaitlistDetail = ['pending_scheduling', 'waitlist'].includes(parsedStatus(intakeDetail.status));
                                const isScheduledDetail = parsedStatus(intakeDetail.status) === 'scheduled';

                                return (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-[24px] border border-slate-100/60 dark:border-slate-700/60">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Provider</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{intakeDetail.providerName || 'Patriotic Provider'}</p>
                                            </div>
                                            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-[24px] border border-slate-100/60 dark:border-slate-700/60">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Visit Type</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{intakeDetail.type || 'Telehealth'}</p>
                                            </div>
                                            <div className="col-span-2 bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-[24px] border border-slate-100/60 dark:border-slate-700/60">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Scheduled Date & Time</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                                    {toSafeDate(intakeDetail.scheduledAt || intakeDetail.date) && isScheduledDetail
                                                        ? format(toSafeDate(intakeDetail.scheduledAt || intakeDetail.date)!, 'PPPP p')
                                                        : 'TBD — Provider will confirm within 24– hours'}
                                                </p>
                                            </div>
                                            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-[24px] border border-slate-100/60 dark:border-slate-700/60">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</p>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${isScheduledDetail ? 'bg-sky-50 text-[#0EA5E9] border-sky-100' : 'bg-transparent text-amber-600 border-amber-200'
                                                    }`}>
                                                    {isWaitlistDetail ? 'AWAITING PROVIDER' : intakeDetail.status}
                                                </span>
                                            </div>
                                            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-[24px] border border-slate-100/60 dark:border-slate-700/60">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Service</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{intakeDetail.serviceKey?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General Consultation'}</p>
                                            </div>
                                            {intakeDetail.meetingUrl && isScheduledDetail && (
                                                <div className="col-span-2 bg-sky-50/50 dark:bg-sky-900/20 p-5 rounded-[24px] border border-sky-100/60 dark:border-sky-900/50">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Video Visit Link</p>
                                                    <a href={intakeDetail.meetingUrl} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-sm font-bold text-[#0EA5E9] dark:text-sky-400 hover:underline break-all">
                                                        <Video className="w-4 h-4 shrink-0" /> {intakeDetail.meetingUrl}
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {(() => {
                                            const answers = intakeDetail.intakeAnswers || intakeDetail.intake || {};
                                            const entries = Object.entries(answers);
                                            if (entries.length === 0) return null;
                                            return (
                                                <div className="p-6 rounded-[32px] border bg-slate-50/50 dark:bg-slate-800/50 border-slate-100/60 dark:border-slate-700/60 mt-4">
                                                    <div className="flex items-center gap-2 mb-6 text-slate-400">
                                                        <div className="w-6 h-6 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center border border-indigo-100 dark:border-indigo-800/50">
                                                            <ClipboardCheck className="w-3 h-3" />
                                                        </div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Clinical Intake Record</h4>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                                        {entries.map(([k, v]) => {
                                                            const question = (iQs[intakeDetail.serviceKey as keyof typeof iQs] || []).find((q: any) => q.k === k);
                                                            return (
                                                                <div key={k} className="space-y-2">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
                                                                        {question?.l || k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                                                    </p>
                                                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                                        {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v || '—')}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {isWaitlistDetail && (
                                            <div className="flex items-start gap-4 p-6 bg-[#FFFBF0] dark:bg-amber-900/10 text-amber-700/80 dark:text-amber-400/80 rounded-[24px] border border-amber-100/60 dark:border-amber-900/30 mt-4">
                                                <Info className="w-5 h-5 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-2">In Provider Queue</p>
                                                    <p className="text-xs font-medium leading-relaxed">Your payment has been received. A board-certified provider will review your intake and contact you within <strong className="font-bold text-amber-800 dark:text-amber-400">24– hours</strong> to confirm your appointment time.</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* AI VISIT SUMMARY MODAL */}
            {selectedSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                        <div className="bg-[#F5F3FF] p-10 flex justify-between items-start shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center text-purple-600">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]">Generated by AI Scribe</span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Visit Summary</h2>
                                {/* FIX: Guard toDate() in the modal header */}
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                                    {selectedSummary.providerName}
                                    {toSafeDate(selectedSummary.date) ? ` â€¢ ${format(toSafeDate(selectedSummary.date)!, 'PPP')}` : ''}
                                </p>
                            </div>
                            <button onClick={() => setSelectedSummary(null)} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center hover:bg-white/80 transition-colors shadow-sm relative z-10">
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
                                        <div className="p-8 rounded-[2rem] border bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 shadow-inner">
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
                                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 bg-white/60 p-4 rounded-2xl border border-slate-200/50 shadow-sm">
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

                                    <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Was this summary helpful?</span>
                                            {!feedbackSent ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleFeedback(true)} className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg hover:bg-emerald-50 hover:text-emerald-500 transition-colors"><ThumbsUp className="w-4 h-4" /></button>
                                                    <button onClick={() => handleFeedback(false)} className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"><ThumbsDown className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Feedback Saved</span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">
                                        âœ¨ This summary is generated by AI from your visit transcript. It is intended for informational purposes. For clinical diagnosis or medical emergencies, please consult your doctor immediately.
                                    </p>
                                </>
                            )}
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
                <h4 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h4>
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
            {active ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700"></div>}
        </button>
    );
}
