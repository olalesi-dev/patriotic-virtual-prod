"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
    AlertCircle, Calendar, CheckCircle, Clock, Filter, MessageSquare,
    MoreHorizontal, RefreshCw, Video, XCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useMemo, useRef, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useTimezonePreference } from '@/hooks/useTimezonePreference';
import {
    PROVIDER_APPOINTMENT_CREATED_EVENT,
    type ProviderAppointmentCreatedEventDetail
} from '@/lib/dashboard-events';
import { auth, db } from '@/lib/firebase';
import { toHourMinuteLabel } from '@/lib/settings';

type DashboardTab = 'Upcoming' | 'Completed' | 'Cancelled' | 'Waitlist';
type AppointmentStatusKey = 'upcoming' | 'checked_in' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'waitlist';
type MutableStatusKey = 'checked_in' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'waitlist';

interface Appointment {
    id: string;
    patient: string;
    displayTime: string;
    type: string;
    statusKey: AppointmentStatusKey;
    statusLabel: string;
    startAt: string | null;
    notes: string | null;
    meetingUrl: string | null;
}

interface Message {
    id: string;
    sender: string;
    preview: string;
    time: string;
    unread: boolean;
    unreadCount?: number;
}

interface WeeklyVolumePoint {
    name: string;
    visits: number;
}

interface DashboardPayload {
    success: boolean;
    providerName?: string;
    appointments?: Appointment[];
    messages?: Message[];
    unreadMessageCount?: number;
    weeklyVolume?: WeeklyVolumePoint[];
    error?: string;
}

interface StatusUpdatePayload {
    success: boolean;
    appointment?: {
        id: string;
        statusKey: AppointmentStatusKey;
        statusLabel: string;
    };
    error?: string;
}

const UPCOMING_KEYS: AppointmentStatusKey[] = ['upcoming', 'checked_in', 'confirmed', 'pending'];
const TAB_OPTIONS: DashboardTab[] = ['Upcoming', 'Completed', 'Cancelled', 'Waitlist'];
const DEFAULT_WEEKLY_VOLUME: WeeklyVolumePoint[] = [
    { name: 'M', visits: 0 },
    { name: 'T', visits: 0 },
    { name: 'W', visits: 0 },
    { name: 'T', visits: 0 },
    { name: 'F', visits: 0 },
    { name: 'S', visits: 0 },
    { name: 'S', visits: 0 }
];

const STATUS_OPTIONS: Array<{ key: MutableStatusKey; label: string }> = [
    { key: 'checked_in', label: 'Checked In' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'waitlist', label: 'Waitlist' }
];

async function buildAuthHeaders(user: FirebaseUser | null) {
    const activeUser = user ?? auth.currentUser;
    if (!activeUser) {
        throw new Error('No active authenticated user.');
    }

    const idToken = await activeUser.getIdToken();
    return {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
    };
}

function readDashboardError(responseStatus: number, payloadError?: string) {
    if (payloadError) return payloadError;
    if (responseStatus === 401) return 'Your session expired. Please sign in again.';
    if (responseStatus === 403) return 'You do not have access to provider dashboard data.';
    if (responseStatus >= 500) return 'Dashboard API is currently unavailable.';
    return 'Unable to load dashboard data.';
}

function readString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

function toRelativeTime(value: Date | null): string {
    if (!value) return '—';
    const now = Date.now();
    const diffMs = now - value.getTime();
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    if (diffMs < minuteMs) return 'just now';
    if (diffMs < hourMs) return `${Math.floor(diffMs / minuteMs)}m ago`;
    if (diffMs < dayMs) return `${Math.floor(diffMs / hourMs)}h ago`;
    if (diffMs < 7 * dayMs) return `${Math.floor(diffMs / dayMs)}d ago`;

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value);
}

export default function EmrDashboard() {
    const router = useRouter();
    const scheduleRef = useRef<HTMLDivElement>(null);
    const inboxRef = useRef<HTMLDivElement>(null);
    const preferredTimezone = useTimezonePreference();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumePoint[]>(DEFAULT_WEEKLY_VOLUME);
    const [activeTab, setActiveTab] = useState<DashboardTab>('Upcoming');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [providerName, setProviderName] = useState('Provider');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSeedingDemo, setIsSeedingDemo] = useState(false);
    const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeUser, setActiveUser] = useState<FirebaseUser | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const filteredAppointments = useMemo(
        () => appointments.filter((appointment) => {
            if (activeTab === 'Upcoming') return UPCOMING_KEYS.includes(appointment.statusKey);
            if (activeTab === 'Completed') return appointment.statusKey === 'completed';
            if (activeTab === 'Cancelled') return appointment.statusKey === 'cancelled';
            return appointment.statusKey === 'waitlist';
        }),
        [activeTab, appointments]
    );

    const upcomingCount = useMemo(
        () => appointments.filter((appointment) => UPCOMING_KEYS.includes(appointment.statusKey)).length,
        [appointments]
    );

    const completedCount = useMemo(
        () => appointments.filter((appointment) => appointment.statusKey === 'completed').length,
        [appointments]
    );

    const cancelledCount = useMemo(
        () => appointments.filter((appointment) => appointment.statusKey === 'cancelled').length,
        [appointments]
    );

    const waitlistCount = useMemo(
        () => appointments.filter((appointment) => appointment.statusKey === 'waitlist').length,
        [appointments]
    );

    const fetchDashboard = React.useCallback(async (user: FirebaseUser, backgroundRefresh: boolean = false) => {
        if (!backgroundRefresh) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            const authHeaders = await buildAuthHeaders(user);
            const response = await fetch('/api/dashboard/provider', {
                method: 'GET',
                headers: authHeaders,
                cache: 'no-store'
            });

            const payload = await response.json() as DashboardPayload;
            if (!response.ok || !payload.success) {
                throw new Error(readDashboardError(response.status, payload.error));
            }

            const payloadMessages = payload.messages || [];
            setProviderName(payload.providerName || 'Provider');
            setAppointments(payload.appointments || []);
            setMessages(payloadMessages);
            setUnreadCount(
                typeof payload.unreadMessageCount === 'number'
                    ? payload.unreadMessageCount
                    : payloadMessages.reduce((total, message) => (
                        total + (
                            typeof message.unreadCount === 'number'
                                ? message.unreadCount
                                : (message.unread ? 1 : 0)
                        )
                    ), 0)
            );
            setWeeklyVolume(payload.weeklyVolume?.length ? payload.weeklyVolume : DEFAULT_WEEKLY_VOLUME);
            setError(null);
        } catch (fetchError: unknown) {
            const message = fetchError instanceof Error ? fetchError.message : 'Unable to load dashboard data.';
            setError(message);
        } finally {
            if (!backgroundRefresh) {
                setIsLoading(false);
            } else {
                setIsRefreshing(false);
            }
        }
    }, []);

    React.useEffect(() => {
        let refreshTimer: ReturnType<typeof setInterval> | null = null;

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            setActiveUser(user);

            if (!user) {
                setError('Please sign in to view dashboard data.');
                setIsLoading(false);
                if (refreshTimer) clearInterval(refreshTimer);
                return;
            }

            await fetchDashboard(user, false);

            if (refreshTimer) clearInterval(refreshTimer);
            refreshTimer = setInterval(() => {
                const currentUser = auth.currentUser;
                if (!currentUser) return;
                fetchDashboard(currentUser, true).catch(() => undefined);
            }, 45_000);
        });

        return () => {
            unsubscribeAuth();
            if (refreshTimer) clearInterval(refreshTimer);
        };
    }, [fetchDashboard]);

    React.useEffect(() => {
        if (!activeUser) {
            setMessages([]);
            setUnreadCount(0);
            return;
        }

        const threadsQuery = query(
            collection(db, 'threads'),
            where('providerId', '==', activeUser.uid)
        );

        const unsubscribeThreads = onSnapshot(threadsQuery, (snapshot) => {
            const mappedMessages = snapshot.docs.map((threadDoc) => {
                const data = threadDoc.data() as Record<string, unknown>;
                const providerUnreadRaw = typeof data.providerUnreadCount === 'number'
                    ? data.providerUnreadCount
                    : (typeof data.unreadCount === 'number' ? data.unreadCount : 0);
                const unreadCountForThread = providerUnreadRaw > 0
                    ? providerUnreadRaw
                    : (data.unread === true ? 1 : 0);
                const lastMessageDate = asDate(data.lastMessageAt) ?? asDate(data.updatedAt) ?? asDate(data.createdAt);

                return {
                    id: threadDoc.id,
                    sender: readString(data.patientName) ?? readString(data.patient) ?? readString(data.subject) ?? 'Patient',
                    preview: readString(data.lastMessage) ?? readString(data.subject) ?? 'New message',
                    time: toRelativeTime(lastMessageDate),
                    unread: unreadCountForThread > 0,
                    unreadCount: unreadCountForThread,
                    sortAt: lastMessageDate?.getTime() ?? 0
                };
            });

            mappedMessages.sort((a, b) => {
                const unreadWeightDelta = Number(b.unread) - Number(a.unread);
                if (unreadWeightDelta !== 0) return unreadWeightDelta;
                return b.sortAt - a.sortAt;
            });

            setUnreadCount(
                mappedMessages.reduce((total, message) => total + message.unreadCount, 0)
            );
            setMessages(
                mappedMessages.slice(0, 8).map(({ sortAt: _sortAt, ...message }) => message)
            );
        }, (listenerError) => {
            console.error('Provider dashboard threads listener error:', listenerError);
        });

        return () => {
            unsubscribeThreads();
        };
    }, [activeUser]);

    React.useEffect(() => {
        if (!activeUser) return;

        const appointmentsQuery = query(
            collection(db, 'appointments'),
            where('providerId', '==', activeUser.uid)
        );

        const unsubscribeAppointments = onSnapshot(appointmentsQuery, () => {
            fetchDashboard(activeUser, true).catch((listenerError) => {
                console.error('Provider dashboard appointments refresh error:', listenerError);
            });
        }, (listenerError) => {
            console.error('Provider appointments listener error:', listenerError);
        });

        return () => {
            unsubscribeAppointments();
        };
    }, [activeUser, fetchDashboard]);

    React.useEffect(() => {
        const sortAppointments = (items: Appointment[]) => {
            return [...items].sort((first, second) => {
                if (!first.startAt && !second.startAt) return 0;
                if (!first.startAt) return 1;
                if (!second.startAt) return -1;
                return first.startAt.localeCompare(second.startAt);
            });
        };

        const handleAppointmentCreated = (event: Event) => {
            const customEvent = event as CustomEvent<ProviderAppointmentCreatedEventDetail>;
            const detail = customEvent.detail;
            if (!detail) return;

            setAppointments((previous) => {
                if (detail.mode === 'rollback') {
                    return previous.filter((appointment) => appointment.id !== detail.optimisticId);
                }

                if (detail.mode === 'optimistic') {
                    const merged = [
                        detail.appointment as Appointment,
                        ...previous.filter((appointment) => appointment.id !== detail.optimisticId)
                    ];
                    return sortAppointments(merged);
                }

                const merged = [
                    detail.appointment as Appointment,
                    ...previous.filter((appointment) => (
                        appointment.id !== detail.optimisticId &&
                        appointment.id !== detail.appointment.id
                    ))
                ];
                return sortAppointments(merged);
            });
        };

        window.addEventListener(PROVIDER_APPOINTMENT_CREATED_EVENT, handleAppointmentCreated as EventListener);
        return () => {
            window.removeEventListener(PROVIDER_APPOINTMENT_CREATED_EVENT, handleAppointmentCreated as EventListener);
        };
    }, []);

    const scrollToSchedule = () => {
        setActiveTab('Upcoming');
        scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const scrollToInbox = () => {
        inboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleRefresh = async () => {
        if (!activeUser) return;
        await fetchDashboard(activeUser, true);
    };

    const handleSeedDemoData = async () => {
        if (!activeUser) return;
        setIsSeedingDemo(true);
        setError(null);

        try {
            const authHeaders = await buildAuthHeaders(activeUser);
            const response = await fetch('/api/temp/seed-provider-dashboard', {
                method: 'POST',
                headers: authHeaders
            });

            const payload = await response.json() as { success?: boolean; error?: string };
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to seed demo data.');
            }

            await fetchDashboard(activeUser, true);
        } catch (seedError: unknown) {
            const message = seedError instanceof Error ? seedError.message : 'Unable to seed demo data.';
            setError(message);
        } finally {
            setIsSeedingDemo(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: MutableStatusKey) => {
        if (!activeUser) {
            setError('Please sign in again to update appointment status.');
            return;
        }

        setStatusUpdatingId(id);
        setMenuOpenId(null);

        try {
            const authHeaders = await buildAuthHeaders(activeUser);
            const response = await fetch(`/api/dashboard/appointments/${id}`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ status: newStatus })
            });

            const payload = await response.json() as StatusUpdatePayload;
            if (!response.ok || !payload.success || !payload.appointment) {
                throw new Error(payload.error || 'Failed to update appointment status.');
            }

            setAppointments((previous) => previous.map((appointment) => (
                appointment.id === id
                    ? {
                        ...appointment,
                        statusKey: payload.appointment?.statusKey ?? appointment.statusKey,
                        statusLabel: payload.appointment?.statusLabel ?? appointment.statusLabel
                    }
                    : appointment
            )));
        } catch (updateError: unknown) {
            const message = updateError instanceof Error ? updateError.message : 'Failed to update status.';
            setError(message);
        } finally {
            setStatusUpdatingId(null);
        }
    };

    const handleJoinCall = (appointment: Appointment) => {
        if (appointment.meetingUrl) {
            window.open(appointment.meetingUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        router.push(`/telehealth?appointmentId=${appointment.id}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-[55vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading live dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up pb-10">
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2 text-red-700 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="text-xs font-semibold text-red-700 hover:text-red-900"
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-8 relative overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
                <div className="absolute bottom-0 right-20 w-32 h-32 bg-purple-100/50 rounded-full blur-2xl -mb-10 pointer-events-none group-hover:scale-125 transition-transform duration-700 delay-100"></div>

                <div className="relative z-10 max-w-3xl">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        Welcome back, {providerName}
                    </h2>
                    <p className="text-slate-500 mb-6 max-w-lg leading-relaxed">
                        You have <button onClick={scrollToSchedule} className="font-bold text-brand hover:underline cursor-pointer">{upcomingCount} appointments</button> today and <button onClick={scrollToInbox} className="font-bold text-brand hover:underline cursor-pointer">{unreadCount} unread messages</button>.
                        Your telehealth waiting room is active.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/telehealth"
                            className="bg-brand hover:bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                            <Video className="w-4 h-4" />
                            Open Waiting Room
                        </Link>
                        <button
                            onClick={scrollToSchedule}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors hover:border-slate-300 shadow-sm"
                        >
                            View Schedule
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors hover:border-slate-300 shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </section>

            <div className="border-b border-slate-200">
                <div className="flex gap-8">
                    {TAB_OPTIONS.map((tab) => (
                        <Tab
                            key={tab}
                            label={tab}
                            active={activeTab === tab}
                            onClick={() => setActiveTab(tab)}
                            count={
                                tab === 'Upcoming' ? upcomingCount :
                                    tab === 'Completed' ? completedCount :
                                        tab === 'Cancelled' ? cancelledCount :
                                            waitlistCount
                            }
                        />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4" ref={scheduleRef}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-slate-800">
                            {activeTab} Schedule <span className="text-slate-400 font-normal text-sm ml-2">({filteredAppointments.length})</span>
                        </h3>
                        {activeTab === 'Upcoming' && (
                            <button className="text-xs font-semibold text-slate-500 flex items-center gap-1 hover:text-brand transition-colors bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                <Filter className="w-3 h-3" /> Live
                            </button>
                        )}
                    </div>

                    <div className="space-y-3 min-h-[300px]">
                        {filteredAppointments.length === 0 ? (
                            <div className="text-center py-12 border border-slate-100 border-dashed rounded-xl bg-slate-50/50">
                                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium text-sm mb-4">No {activeTab.toLowerCase()} appointments.</p>
                                <button
                                    onClick={handleSeedDemoData}
                                    disabled={isSeedingDemo}
                                    className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                                >
                                    {isSeedingDemo ? 'Seeding realistic data...' : 'Seed Realistic Demo Data'}
                                </button>
                            </div>
                        ) : (
                            filteredAppointments.map((appointment) => (
                                <ScheduleCard
                                    key={appointment.id}
                                    appointment={appointment}
                                    preferredTimezone={preferredTimezone}
                                    isMenuOpen={menuOpenId === appointment.id}
                                    statusUpdating={statusUpdatingId === appointment.id}
                                    onToggleMenu={() => setMenuOpenId(menuOpenId === appointment.id ? null : appointment.id)}
                                    onStatusChange={handleUpdateStatus}
                                    onJoin={() => handleJoinCall(appointment)}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 text-sm">Weekly Volume</h3>
                            <span className="text-xs text-brand font-medium bg-brand-50 px-2 py-1 rounded-full">
                                Real-time
                            </span>
                        </div>
                        <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyVolume}>
                                    <defs>
                                        <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip
                                        cursor={{ stroke: '#e2e8f0' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="visits" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorBrand)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow" ref={inboxRef}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-25/50">
                            <h3 className="font-bold text-slate-800 text-sm">Recent Messages <span className="text-slate-400 font-normal">({unreadCount})</span></h3>
                            <Link href="/inbox" className="text-xs font-semibold text-brand hover:underline">View All</Link>
                        </div>
                        <div>
                            {messages.length === 0 ? (
                                <div className="p-6 text-center">
                                    <MessageSquare className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">No recent provider messages.</p>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <InboxItem key={message.id} message={message} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Tab({
    label,
    active,
    onClick,
    count
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    count: number;
}) {
    return (
        <button
            onClick={onClick}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${active
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
        >
            {label}
            {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                </span>
            )}
        </button>
    );
}

function ScheduleCard({
    appointment,
    preferredTimezone,
    isMenuOpen,
    statusUpdating,
    onToggleMenu,
    onStatusChange,
    onJoin
}: {
    appointment: Appointment;
    preferredTimezone: string;
    isMenuOpen: boolean;
    statusUpdating: boolean;
    onToggleMenu: () => void;
    onStatusChange: (id: string, status: MutableStatusKey) => void;
    onJoin: () => void;
}) {
    const statusColors: Record<AppointmentStatusKey, string> = {
        upcoming: 'bg-slate-50 text-slate-600 border-slate-100',
        checked_in: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        confirmed: 'bg-blue-50 text-blue-700 border-blue-100',
        pending: 'bg-amber-50 text-amber-700 border-amber-100',
        completed: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        cancelled: 'bg-red-50 text-red-700 border-red-100',
        waitlist: 'bg-purple-50 text-purple-700 border-purple-100'
    };

    const isActionable = ['upcoming', 'checked_in', 'confirmed'].includes(appointment.statusKey);
    const fallbackDisplay = appointment.displayTime;
    const computedDisplay = appointment.startAt
        ? toHourMinuteLabel(new Date(appointment.startAt), preferredTimezone)
        : fallbackDisplay;
    const [timePart, meridiem] = computedDisplay.split(' ');

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer hover:border-brand/30 relative">
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 font-mono group-hover:bg-brand-50 group-hover:text-brand transition-colors">
                    <span className="text-xs font-bold uppercase">{meridiem || ''}</span>
                    <span className="text-base font-bold leading-tight">{timePart || computedDisplay}</span>
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-brand transition-colors">{appointment.patient}</h4>
                    <p className="text-xs text-slate-500 font-medium">{appointment.type}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusColors[appointment.statusKey]}`}>
                    {appointment.statusLabel}
                </span>

                {isActionable && (
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            onJoin();
                        }}
                        className="bg-brand text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-brand-600 transition-colors shadow-sm active:scale-95 flex items-center gap-1"
                    >
                        <Video className="w-3 h-3" />
                        Join
                    </button>
                )}

                <div className="relative">
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            if (!statusUpdating) onToggleMenu();
                        }}
                        disabled={statusUpdating}
                        className={`text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors ${isMenuOpen ? 'bg-slate-100 text-slate-600' : ''}`}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <div className="py-1">
                                <div className="px-3 py-2 border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Update Status
                                </div>
                                {STATUS_OPTIONS.map((statusOption) => (
                                    <button
                                        key={statusOption.key}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onStatusChange(appointment.id, statusOption.key);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2 ${statusOption.key === appointment.statusKey ? 'text-brand font-bold bg-brand-50' : 'text-slate-700'}`}
                                    >
                                        {statusOption.key === 'checked_in' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                        {statusOption.key === 'completed' && <CheckCircle className="w-3 h-3 text-indigo-500" />}
                                        {statusOption.key === 'cancelled' && <XCircle className="w-3 h-3 text-red-500" />}
                                        {statusOption.key === 'confirmed' && <Clock className="w-3 h-3 text-blue-500" />}
                                        {statusOption.key === 'pending' && <Clock className="w-3 h-3 text-amber-500" />}
                                        {statusOption.key === 'waitlist' && <Clock className="w-3 h-3 text-purple-500" />}
                                        Mark as {statusOption.label}
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

function InboxItem({ message }: { message: Message }) {
    return (
        <Link href="/inbox" className={`block p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer flex items-start gap-3 group transition-colors ${message.unread ? 'bg-indigo-50/30' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                {message.sender.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className={`text-sm truncate ${message.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{message.sender}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{message.time}</span>
                </div>
                <p className={`text-xs truncate ${message.unread ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>{message.preview}</p>
            </div>
            {message.unread && <div className="w-2 h-2 rounded-full bg-brand mt-1.5"></div>}
        </Link>
    );
}
