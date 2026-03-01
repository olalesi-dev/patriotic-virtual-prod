"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, addMinutes, format, isAfter, isBefore, subMinutes } from 'date-fns';
import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    AlertCircle,
    ArrowRight,
    Calendar as CalendarIcon,
    Camera,
    CheckCircle2,
    ChevronRight,
    Clock,
    History,
    MapPin,
    Mic,
    MoreVertical,
    Plus,
    ShieldCheck,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    User,
    Video,
    X
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { useTimezonePreference } from '@/hooks/useTimezonePreference';
import { auth, db } from '@/lib/firebase';

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
    type: 'Telehealth' | 'In-Person' | string;
    status: 'scheduled' | 'cancelled' | 'completed' | string;
    reason: string;
    meetingUrl?: string | null;
    globalAppointmentId?: string;
    patientDocId?: string;
}

interface Provider {
    id: string;
    name: string;
    specialty: string;
}

const rescheduleFormSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Valid time is required')
}).superRefine((values, ctx) => {
    const scheduledDate = new Date(`${values.date}T${values.time}:00`);
    if (Number.isNaN(scheduledDate.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Please choose a valid date and time.', path: ['date'] });
        return;
    }
    if (!isAfter(scheduledDate, new Date())) {
        ctx.addIssue({ code: 'custom', message: 'Reschedule time must be in the future.', path: ['date'] });
    }
});

type RescheduleFormValues = z.infer<typeof rescheduleFormSchema>;

function parseAppointmentDate(raw: Record<string, unknown>): Timestamp | null {
    if (raw.date instanceof Timestamp) return raw.date;
    if (raw.startTime instanceof Timestamp) return raw.startTime;

    if (typeof raw.date === 'string' && typeof raw.time === 'string') {
        const parsed = new Date(`${raw.date}T${raw.time}:00`);
        if (!Number.isNaN(parsed.getTime())) {
            return Timestamp.fromDate(parsed);
        }
    }

    if (typeof raw.startTime === 'string') {
        const parsed = new Date(raw.startTime);
        if (!Number.isNaN(parsed.getTime())) {
            return Timestamp.fromDate(parsed);
        }
    }

    if (typeof raw.date === 'string') {
        const parsed = new Date(raw.date);
        if (!Number.isNaN(parsed.getTime())) {
            return Timestamp.fromDate(parsed);
        }
    }

    return null;
}

function normalizeAppointment(raw: Record<string, unknown>, id: string): Appointment | null {
    const date = parseAppointmentDate(raw);
    if (!date) return null;

    const providerName = typeof raw.providerName === 'string' && raw.providerName.trim() !== ''
        ? raw.providerName
        : (typeof raw.doctor === 'string' && raw.doctor.trim() !== '' ? raw.doctor : 'Provider');

    const typeRaw = typeof raw.type === 'string' ? raw.type.toLowerCase() : '';
    const type = typeRaw.includes('person') ? 'In-Person' : 'Telehealth';

    const statusRaw = typeof raw.status === 'string' ? raw.status.toLowerCase() : 'scheduled';
    const status = statusRaw === 'cancelled' || statusRaw === 'canceled'
        ? 'cancelled'
        : (statusRaw === 'completed' ? 'completed' : 'scheduled');

    const globalAppointmentId = typeof raw.globalAppointmentId === 'string' && raw.globalAppointmentId.trim() !== ''
        ? raw.globalAppointmentId
        : id;

    return {
        id,
        date,
        providerName,
        providerId: typeof raw.providerId === 'string' ? raw.providerId : '',
        type,
        status,
        reason: typeof raw.reason === 'string' ? raw.reason : (typeof raw.notes === 'string' ? raw.notes : ''),
        meetingUrl: typeof raw.meetingUrl === 'string' ? raw.meetingUrl : null,
        globalAppointmentId
    };
}

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const preferredTimezone = useTimezonePreference();

    // Scheduling Flow State
    const [isScheduling, setIsScheduling] = useState(false);
    const [step, setStep] = useState(1);
    const [providers, setProviders] = useState<Provider[]>([]);

    // Form Values
    const [newAppt, setNewAppt] = useState({
        type: 'Telehealth' as 'Telehealth' | 'In-Person',
        providerId: '',
        providerName: '',
        date: new Date(addDays(new Date(), 1).setHours(10, 0, 0, 0)),
        reason: ''
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
    const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
    const rescheduleForm = useForm<RescheduleFormValues>({
        resolver: zodResolver(rescheduleFormSchema),
        defaultValues: {
            date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            time: '10:00'
        }
    });

    const getPatientDisplayName = () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return 'Patient';
        if (currentUser.displayName && currentUser.displayName.trim() !== '') {
            return currentUser.displayName.trim();
        }
        if (currentUser.email && currentUser.email.trim() !== '') {
            return currentUser.email.split('@')[0];
        }
        return 'Patient';
    };

    const notifyProviderForAppointment = async (
        type: 'appointment_booked' | 'appointment_rescheduled' | 'appointment_cancelled',
        appointmentId: string
    ) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type,
                    appointmentId
                })
            });

            if (!response.ok) {
                const payload = await response.json() as { error?: string };
                console.warn('Appointment notification warning:', payload.error ?? 'Unknown send error');
            }
        } catch (notificationError) {
            console.warn('Appointment notification warning:', notificationError);
        }
    };

    const buildGlobalAppointmentPayload = ({
        patientId,
        providerId,
        providerName,
        appointmentDate,
        type,
        reason,
        meetingUrl,
        status
    }: {
        patientId: string;
        providerId: string;
        providerName: string;
        appointmentDate: Date;
        type: 'Telehealth' | 'In-Person' | string;
        reason: string;
        meetingUrl: string | null;
        status: 'pending' | 'completed' | 'cancelled';
    }) => ({
        patientId,
        patientUid: patientId,
        patientName: getPatientDisplayName(),
        patient: getPatientDisplayName(),
        providerId,
        providerName,
        doctor: providerName,
        date: format(appointmentDate, 'yyyy-MM-dd'),
        time: format(appointmentDate, 'HH:mm'),
        startTime: Timestamp.fromDate(appointmentDate),
        type: type === 'In-Person' ? 'In-Person' : 'Telehealth',
        service: type === 'In-Person' ? 'In-Person Visit' : 'Telehealth Visit',
        reason,
        notes: reason,
        status,
        meetingUrl,
        source: 'patient_portal',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    });

    const syncLegacyAppointmentsToGlobal = async (uid: string) => {
        try {
            const legacySnapshot = await getDocs(collection(db, 'patients', uid, 'appointments'));
            const syncTasks = legacySnapshot.docs.map(async (legacyDoc) => {
                const data = legacyDoc.data() as Record<string, unknown>;
                if (typeof data.globalAppointmentId === 'string' && data.globalAppointmentId.trim() !== '') {
                    return;
                }

                const normalized = normalizeAppointment(data, legacyDoc.id);
                if (!normalized || !normalized.providerId) return;

                const appointmentDate = normalized.date.toDate();
                const statusForProvider: 'pending' | 'completed' | 'cancelled' =
                    normalized.status === 'completed'
                        ? 'completed'
                        : (normalized.status === 'cancelled' ? 'cancelled' : 'pending');

                const globalRef = await addDoc(collection(db, 'appointments'), buildGlobalAppointmentPayload({
                    patientId: uid,
                    providerId: normalized.providerId,
                    providerName: normalized.providerName,
                    appointmentDate,
                    type: normalized.type,
                    reason: normalized.reason,
                    meetingUrl: normalized.meetingUrl ?? null,
                    status: statusForProvider
                }));

                await updateDoc(doc(db, 'patients', uid, 'appointments', legacyDoc.id), {
                    globalAppointmentId: globalRef.id,
                    syncedToGlobalAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            });

            await Promise.all(syncTasks);
        } catch (syncError) {
            console.error('Legacy appointment sync error:', syncError);
        }
    };

    useEffect(() => {
        let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
        let unsubscribeAppointmentListeners: (() => void) | null = null;

        const scheduleRefresh = (uid: string) => {
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
            }
            refreshTimeout = setTimeout(() => {
                fetchAppointments(uid);
            }, 80);
        };

        const clearAppointmentListeners = () => {
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
                refreshTimeout = null;
            }
            if (unsubscribeAppointmentListeners) {
                unsubscribeAppointmentListeners();
                unsubscribeAppointmentListeners = null;
            }
        };

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            clearAppointmentListeners();
            if (user) {
                const unsubscribeLegacy = onSnapshot(
                    query(
                        collection(db, 'patients', user.uid, 'appointments'),
                        orderBy('date', 'desc')
                    ),
                    () => {
                        scheduleRefresh(user.uid);
                    },
                    (error) => {
                        console.error('Legacy appointments listener error:', error);
                        scheduleRefresh(user.uid);
                    }
                );
                const unsubscribeGlobalByPatientId = onSnapshot(
                    query(
                        collection(db, 'appointments'),
                        where('patientId', '==', user.uid)
                    ),
                    () => {
                        scheduleRefresh(user.uid);
                    },
                    (error) => {
                        console.error('Global appointments listener error (patientId):', error);
                        scheduleRefresh(user.uid);
                    }
                );
                const unsubscribeGlobalByPatientUid = onSnapshot(
                    query(
                        collection(db, 'appointments'),
                        where('patientUid', '==', user.uid)
                    ),
                    () => {
                        scheduleRefresh(user.uid);
                    },
                    (error) => {
                        console.error('Global appointments listener error (patientUid):', error);
                        scheduleRefresh(user.uid);
                    }
                );

                unsubscribeAppointmentListeners = () => {
                    unsubscribeLegacy();
                    unsubscribeGlobalByPatientId();
                    unsubscribeGlobalByPatientUid();
                };

                syncLegacyAppointmentsToGlobal(user.uid)
                    .finally(() => {
                        scheduleRefresh(user.uid);
                    });
                fetchProviders();
            } else {
                setAppointments([]);
                setLoading(false);
            }
        });
        return () => {
            clearAppointmentListeners();
            unsubscribeAuth();
        };
    }, []);

    const fetchAppointments = async (uid: string) => {
        try {
            const [legacySnapshot, globalByPatientIdSnapshot, globalByPatientUidSnapshot] = await Promise.all([
                getDocs(query(
                    collection(db, 'patients', uid, 'appointments'),
                    orderBy('date', 'desc')
                )),
                getDocs(query(
                    collection(db, 'appointments'),
                    where('patientId', '==', uid)
                )),
                getDocs(query(
                    collection(db, 'appointments'),
                    where('patientUid', '==', uid)
                ))
            ]);

            const appointmentsByGlobalId = new Map<string, Appointment>();
            const globalDocsById = new Map<string, { id: string; data: Record<string, unknown> }>();

            globalByPatientIdSnapshot.docs.forEach((docSnap) => {
                globalDocsById.set(docSnap.id, {
                    id: docSnap.id,
                    data: docSnap.data() as Record<string, unknown>
                });
            });
            globalByPatientUidSnapshot.docs.forEach((docSnap) => {
                globalDocsById.set(docSnap.id, {
                    id: docSnap.id,
                    data: docSnap.data() as Record<string, unknown>
                });
            });

            globalDocsById.forEach((globalDoc) => {
                const normalized = normalizeAppointment(globalDoc.data, globalDoc.id);
                if (!normalized) return;
                appointmentsByGlobalId.set(globalDoc.id, {
                    ...normalized,
                    globalAppointmentId: globalDoc.id,
                    patientDocId: globalDoc.id
                });
            });

            legacySnapshot.docs.forEach((docSnap) => {
                const normalized = normalizeAppointment(docSnap.data() as Record<string, unknown>, docSnap.id);
                if (!normalized) return;
                const key = normalized.globalAppointmentId || docSnap.id;
                const existing = appointmentsByGlobalId.get(key);
                if (existing) {
                    appointmentsByGlobalId.set(key, {
                        ...existing,
                        reason: existing.reason || normalized.reason,
                        patientDocId: docSnap.id,
                        id: key,
                        globalAppointmentId: key
                    });
                    return;
                }

                appointmentsByGlobalId.set(key, {
                    ...normalized,
                    id: key,
                    globalAppointmentId: key,
                    patientDocId: docSnap.id
                });
            });

            const mergedAppointments = Array.from(appointmentsByGlobalId.values())
                .sort((first, second) => second.date.toMillis() - first.date.toMillis());

            setAppointments(mergedAppointments);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            toast.error('Failed to load appointments');
            setLoading(false);
        }
    };

    const fetchProviders = async () => {
        try {
            const q = query(collection(db, 'users'), where('role', 'in', ['provider', 'doctor', 'clinician', 'admin']));
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
        if (!auth.currentUser) return;
        if (!newAppt.providerId || !newAppt.providerName) {
            toast.error('Please select a provider before scheduling.');
            setStep(2);
            return;
        }
        if (!newAppt.reason.trim()) {
            toast.error('Please add a reason for your visit.');
            setStep(4);
            return;
        }

        const currentUser = auth.currentUser;
        const appointmentDate = newAppt.date;
        const meetingUrl = newAppt.type === 'Telehealth'
            ? `https://doxy.me/patriotic-visit-${Math.random().toString(36).substring(2, 9)}`
            : null;
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticAppointment: Appointment = {
            id: optimisticId,
            globalAppointmentId: optimisticId,
            date: Timestamp.fromDate(appointmentDate),
            providerName: newAppt.providerName,
            providerId: newAppt.providerId,
            type: newAppt.type,
            status: 'scheduled',
            reason: newAppt.reason.trim(),
            meetingUrl
        };

        setAppointments((previous) => [optimisticAppointment, ...previous]);
        setIsScheduling(false);
        setStep(1);

        try {
            // HIPAA: Sanitize all user-inputted fields
            const sanitizedReason = sanitize(newAppt.reason);

            const globalRef = await addDoc(collection(db, 'appointments'), buildGlobalAppointmentPayload({
                patientId: currentUser.uid,
                providerId: newAppt.providerId,
                providerName: newAppt.providerName,
                appointmentDate,
                type: newAppt.type,
                reason: sanitizedReason,
                meetingUrl,
                status: 'pending'
            }));

            await setDoc(doc(db, 'patients', currentUser.uid, 'appointments', globalRef.id), {
                ...newAppt,
                status: 'scheduled',
                globalAppointmentId: globalRef.id,
                date: Timestamp.fromDate(appointmentDate),
                reason: sanitizedReason,
                meetingUrl,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            void notifyProviderForAppointment('appointment_booked', globalRef.id);

            await logAuditEvent({
                userId: currentUser.uid,
                action: 'APPOINTMENT_SCHEDULED',
                details: { provider: newAppt.providerName, type: newAppt.type }
            });

            setAppointments((previous) => previous.filter((appointment) => appointment.id !== optimisticId));
            await fetchAppointments(currentUser.uid);
            toast.success('Appointment scheduled successfully!', {
                icon: '🗓️',
                className: 'font-black uppercase tracking-widest text-xs'
            });
        } catch (error) {
            console.error('Schedule error:', error);
            setAppointments((previous) => previous.filter((appointment) => appointment.id !== optimisticId));
            toast.error('Failed to schedule appointment');
        }
    };

    const openRescheduleModal = (appointment: Appointment) => {
        const currentDate = appointment.date.toDate();
        setReschedulingAppt(appointment);
        rescheduleForm.reset({
            date: format(currentDate, 'yyyy-MM-dd'),
            time: format(currentDate, 'HH:mm')
        });
    };

    const handleReschedule = async (values: RescheduleFormValues) => {
        if (!auth.currentUser || !reschedulingAppt) return;

        const nextDateTime = new Date(`${values.date}T${values.time}:00`);

        const previousAppointments = appointments;
        const appointmentId = reschedulingAppt.id;
        const globalAppointmentId = reschedulingAppt.globalAppointmentId || appointmentId;
        const patientDocId = reschedulingAppt.patientDocId || globalAppointmentId;

        setAppointments((previous) => previous.map((appointment) => (
            appointment.id === appointmentId
                ? { ...appointment, date: Timestamp.fromDate(nextDateTime), status: 'scheduled' }
                : appointment
        )));
        setReschedulingAppt(null);

        try {
            const updates = await Promise.allSettled([
                updateDoc(doc(db, 'appointments', globalAppointmentId), {
                    date: values.date,
                    time: values.time,
                    startTime: Timestamp.fromDate(nextDateTime),
                    status: 'pending',
                    rescheduledAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }),
                updateDoc(doc(db, 'patients', auth.currentUser.uid, 'appointments', patientDocId), {
                    date: Timestamp.fromDate(nextDateTime),
                    status: 'scheduled',
                    rescheduledAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                })
            ]);

            const allFailed = updates.every((result) => result.status === 'rejected');
            if (allFailed) {
                throw new Error('Reschedule update failed for both patient and provider records.');
            }

            void notifyProviderForAppointment('appointment_rescheduled', globalAppointmentId);
            await fetchAppointments(auth.currentUser.uid);
            toast.success('Appointment rescheduled successfully');
        } catch (error) {
            console.error('Reschedule error:', error);
            setAppointments(previousAppointments);
            toast.error('Failed to reschedule appointment');
        }
    };

    const handleCancel = async (apptId: string) => {
        if (!auth.currentUser) return;

        const reason = window.prompt('Please enter a reason for cancellation:');
        if (reason === null) return;
        const sanitizedReason = sanitize(reason);
        const previousAppointments = appointments;
        const targetAppointment = appointments.find((appointment) => appointment.id === apptId);
        const globalAppointmentId = targetAppointment?.globalAppointmentId || apptId;
        const patientDocId = targetAppointment?.patientDocId || globalAppointmentId;

        setAppointments((previous) => previous.map((appointment) => (
            appointment.id === apptId
                ? { ...appointment, status: 'cancelled' }
                : appointment
        )));

        try {
            const updates = await Promise.allSettled([
                updateDoc(doc(db, 'patients', auth.currentUser.uid, 'appointments', patientDocId), {
                    status: 'cancelled',
                    cancellationReason: sanitizedReason,
                    cancelledAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }),
                updateDoc(doc(db, 'appointments', globalAppointmentId), {
                    status: 'cancelled',
                    cancellationReason: sanitizedReason,
                    cancelledAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                })
            ]);

            const allFailed = updates.every((result) => result.status === 'rejected');
            if (allFailed) {
                throw new Error('Cancellation update failed for both patient and provider views.');
            }

            void notifyProviderForAppointment('appointment_cancelled', globalAppointmentId);
            toast.success('Appointment cancelled');
        } catch (error) {
            console.error('Cancel error:', error);
            setAppointments(previousAppointments);
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

    const formatForTimezone = (value: Date, options: Intl.DateTimeFormatOptions): string => (
        new Intl.DateTimeFormat('en-US', {
            ...options,
            timeZone: preferredTimezone
        }).format(value)
    );

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
                            <span className="text-[10px] font-black text-[#0EA5E9] uppercase">{formatForTimezone(appt.date.toDate(), { month: 'short' })}</span>
                            <span className="text-2xl font-black text-slate-800">{formatForTimezone(appt.date.toDate(), { day: '2-digit' })}</span>
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
                                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {formatForTimezone(appt.date.toDate(), { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
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
                                                onClick={() => openRescheduleModal(appt)}
                                                className="flex-1 md:w-24 bg-white text-slate-400 border border-slate-100 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                                            >
                                                Reschedule
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

            {/* SCHEDULING FLOW MODAL */}
            {isScheduling && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                        <div className="bg-[#0EA5E9] p-8 text-white flex justify-between items-center shrink-0">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Step {step} of 5</p>
                                <h2 className="text-2xl font-black tracking-tight">
                                    {step === 1 && "Select Visit Type"}
                                    {step === 2 && "Choose Physician"}
                                    {step === 3 && "Select Date & Time"}
                                    {step === 4 && "Reason for Visit"}
                                    {step === 5 && "Review & Confirm"}
                                </h2>
                            </div>
                            <button onClick={() => setIsScheduling(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            {step === 1 && (
                                <div className="grid grid-cols-1 gap-4">
                                    <VisitTypeCard
                                        icon={Video}
                                        title="Telehealth"
                                        desc="Secure video call from anywhere"
                                        active={newAppt.type === 'Telehealth'}
                                        onClick={() => { setNewAppt({ ...newAppt, type: 'Telehealth' }); setStep(2); }}
                                    />
                                    <VisitTypeCard
                                        icon={MapPin}
                                        title="In-Person"
                                        desc="Meet your doctor at the clinic"
                                        active={newAppt.type === 'In-Person'}
                                        onClick={() => { setNewAppt({ ...newAppt, type: 'In-Person' }); setStep(2); }}
                                    />
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-3">
                                    {providers.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setNewAppt({ ...newAppt, providerId: p.id, providerName: p.name }); setStep(3); }}
                                            className="w-full p-4 rounded-2xl border border-slate-100 hover:border-[#0EA5E9] hover:bg-sky-50 transition-all text-left flex items-center gap-4 group"
                                        >
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#0EA5E9]">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-sm">{p.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.specialty}</p>
                                            </div>
                                            <ChevronRight className="ml-auto w-4 h-4 text-slate-200" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 overflow-hidden">
                                        <Calendar
                                            onChange={(val) => setNewAppt({ ...newAppt, date: val as Date })}
                                            value={newAppt.date}
                                            minDate={addDays(new Date(), 1)}
                                            className="w-full border-none font-sans !bg-transparent"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM'].map(time => (
                                            <button
                                                key={time}
                                                className={`py-3 rounded-xl font-black text-[10px] border transition-all ${newAppt.date.getHours() === parseInt(time) ? 'bg-[#0EA5E9] text-white border-transparent' : 'bg-white text-slate-500 border-slate-100 hover:border-[#0EA5E9]'}`}
                                                onClick={() => {
                                                    const [h, m] = time.split(':');
                                                    const date = new Date(newAppt.date);
                                                    date.setHours(parseInt(h) + (time.includes('PM') && h !== '12' ? 12 : 0));
                                                    date.setMinutes(parseInt(m));
                                                    setNewAppt({ ...newAppt, date });
                                                }}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setStep(4)}
                                        className="w-full bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                    >
                                        Next <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Why are you booking this visit?</label>
                                        <textarea
                                            className="w-full bg-slate-50 border-none rounded-3xl p-6 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-100 transition-all min-h-[150px] placeholder:text-slate-300"
                                            placeholder="Describe your symptoms or reason for the appointment..."
                                            value={newAppt.reason}
                                            onChange={(e) => setNewAppt({ ...newAppt, reason: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        disabled={!newAppt.reason}
                                        onClick={() => setStep(5)}
                                        className="w-full bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        Review Appointment <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="space-y-8">
                                    <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                                        <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provider</span>
                                            <span className="font-black text-slate-800">{newAppt.providerName}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</span>
                                            <span className="font-black text-slate-800">{format(newAppt.date, 'PPP p')}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                                            <span className="font-black text-[#0EA5E9]">{newAppt.type}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</span>
                                            <p className="text-sm font-bold text-slate-600 italic">{newAppt.reason}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                        <ShieldCheck className="w-4 h-4" /> Secure HIPAA appointment
                                    </div>

                                    <button
                                        onClick={handleSchedule}
                                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        Confirm & Schedule <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {step > 1 && (
                            <div className="p-6 pt-0 shrink-0">
                                <button onClick={() => setStep(step - 1)} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-[#0EA5E9]">
                                    Back to previous step
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* RESCHEDULE MODAL */}
            {reschedulingAppt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reschedule Visit</p>
                                <h2 className="text-xl font-black tracking-tight mt-1">{reschedulingAppt.providerName}</h2>
                            </div>
                            <button
                                onClick={() => setReschedulingAppt(null)}
                                className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={rescheduleForm.handleSubmit(handleReschedule)}>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Date</label>
                                    <input
                                        type="date"
                                        min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                                        {...rescheduleForm.register('date')}
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-[#0EA5E9]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Time</label>
                                    <input
                                        type="time"
                                        {...rescheduleForm.register('time')}
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-[#0EA5E9]"
                                    />
                                </div>
                                {(rescheduleForm.formState.errors.date || rescheduleForm.formState.errors.time) && (
                                    <p className="text-xs font-bold text-rose-500">
                                        {rescheduleForm.formState.errors.date?.message || rescheduleForm.formState.errors.time?.message}
                                    </p>
                                )}
                            </div>

                            <div className="p-6 pt-0 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setReschedulingAppt(null)}
                                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-[#0EA5E9] text-white hover:bg-sky-600 transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
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
                                    if (joiningAppt.meetingUrl) {
                                        window.open(joiningAppt.meetingUrl, '_blank');
                                    } else {
                                        toast.error('No telehealth link is available for this appointment.');
                                    }
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
                            ) : aiSummary && (
                                <>
                                    <SummarySection title="Chief Complaint" content={aiSummary.complaint} />
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
