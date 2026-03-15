"use client";

import React from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import Link from 'next/link';
import {
    Activity,
    Calendar,
    CheckCircle2,
    Clock3,
    MessageSquare,
    RefreshCw,
    Video,
    XCircle
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { auth } from '@/lib/firebase';

type DashboardStatusKey =
    | 'upcoming'
    | 'checked_in'
    | 'confirmed'
    | 'pending'
    | 'completed'
    | 'cancelled'
    | 'waitlist';

type DashboardTab = 'Upcoming' | 'Waitlist' | 'Completed' | 'Cancelled';

interface DashboardAppointment {
    id: string;
    patient: string;
    displayTime: string;
    type: string;
    statusKey: DashboardStatusKey;
    statusLabel: string;
    startAt: string | null;
    submittedAt: string | null;
    notes: string | null;
    meetingUrl: string | null;
}

interface DashboardMessage {
    id: string;
    sender: string;
    preview: string;
    time: string;
    unread: boolean;
    unreadCount: number;
}

interface WeeklyVolumePoint {
    name: string;
    visits: number;
}

interface DashboardApiResponse {
    success?: boolean;
    providerName?: string;
    appointments?: DashboardAppointment[];
    messages?: DashboardMessage[];
    unreadMessageCount?: number;
    weeklyVolume?: WeeklyVolumePoint[];
    error?: string;
}

const DASHBOARD_TABS: DashboardTab[] = ['Upcoming', 'Waitlist', 'Completed', 'Cancelled'];
const UPCOMING_STATUS_KEYS: DashboardStatusKey[] = ['upcoming', 'checked_in', 'confirmed', 'pending'];

async function buildHeaders(activeUser: FirebaseUser): Promise<Record<string, string>> {
    const idToken = await activeUser.getIdToken();
    return {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
    };
}

function getTabForStatus(statusKey: DashboardStatusKey): DashboardTab {
    if (UPCOMING_STATUS_KEYS.includes(statusKey)) return 'Upcoming';
    if (statusKey === 'completed') return 'Completed';
    if (statusKey === 'cancelled') return 'Cancelled';
    return 'Waitlist';
}

function countTabAppointments(appointments: DashboardAppointment[], tab: DashboardTab): number {
    return appointments.filter((appointment) => getTabForStatus(appointment.statusKey) === tab).length;
}

function pickActiveTab(appointments: DashboardAppointment[], preferredTab: DashboardTab): DashboardTab {
    if (countTabAppointments(appointments, preferredTab) > 0) {
        return preferredTab;
    }

    return DASHBOARD_TABS.find((tab) => countTabAppointments(appointments, tab) > 0) ?? 'Upcoming';
}

function formatTimestamp(value: string | null, fallback: string): string {
    if (!value) return fallback;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(parsed);
}

function formatDateLabel(value: string | null, fallback: string): string {
    if (!value) return fallback;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(parsed);
}

function getJoinUrl(meetingUrl: string | null): string | null {
    if (!meetingUrl) return null;
    return meetingUrl.includes('doxy.me') ? 'https://doxy.me/sign-in' : meetingUrl;
}

function getStatusTone(statusKey: DashboardStatusKey) {
    if (statusKey === 'checked_in') {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (statusKey === 'confirmed') {
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (statusKey === 'pending') {
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (statusKey === 'completed') {
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
    if (statusKey === 'cancelled') {
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (statusKey === 'waitlist') {
        return 'bg-violet-50 text-violet-700 border-violet-200';
    }

    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
}

export default function ProviderDashboardPage() {
    const [activeUser, setActiveUser] = React.useState<FirebaseUser | null>(auth.currentUser);
    const [providerName, setProviderName] = React.useState('Provider');
    const [appointments, setAppointments] = React.useState<DashboardAppointment[]>([]);
    const [messages, setMessages] = React.useState<DashboardMessage[]>([]);
    const [weeklyVolume, setWeeklyVolume] = React.useState<WeeklyVolumePoint[]>([]);
    const [unreadMessageCount, setUnreadMessageCount] = React.useState(0);
    const [activeTab, setActiveTab] = React.useState<DashboardTab>('Upcoming');
    const [selectedAppointment, setSelectedAppointment] = React.useState<DashboardAppointment | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [mutatingAppointmentId, setMutatingAppointmentId] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const loadDashboard = React.useCallback(async (user: FirebaseUser, options?: { silent?: boolean }) => {
        if (!options?.silent) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            const headers = await buildHeaders(user);
            const response = await fetch('/api/dashboard/provider', {
                method: 'GET',
                headers,
                cache: 'no-store'
            });
            const payload = await response.json() as DashboardApiResponse;

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to load the provider dashboard.');
            }

            const nextAppointments = payload.appointments ?? [];
            setProviderName(payload.providerName ?? user.displayName ?? 'Provider');
            setAppointments(nextAppointments);
            setMessages(payload.messages ?? []);
            setWeeklyVolume(payload.weeklyVolume ?? []);
            setUnreadMessageCount(payload.unreadMessageCount ?? 0);
            setActiveTab((currentTab) => pickActiveTab(nextAppointments, currentTab));
            setError(null);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : 'Failed to load the provider dashboard.';
            setError(message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setActiveUser(user);
            if (!user) {
                setAppointments([]);
                setMessages([]);
                setWeeklyVolume([]);
                setUnreadMessageCount(0);
                setLoading(false);
                return;
            }

            loadDashboard(user).catch(() => undefined);
        });

        return () => unsubscribe();
    }, [loadDashboard]);

    const counts = React.useMemo(() => ({
        Upcoming: countTabAppointments(appointments, 'Upcoming'),
        Waitlist: countTabAppointments(appointments, 'Waitlist'),
        Completed: countTabAppointments(appointments, 'Completed'),
        Cancelled: countTabAppointments(appointments, 'Cancelled')
    }), [appointments]);

    const filteredAppointments = React.useMemo(() => (
        appointments.filter((appointment) => getTabForStatus(appointment.statusKey) === activeTab)
    ), [activeTab, appointments]);

    const handleJoin = React.useCallback((appointment: DashboardAppointment) => {
        const joinUrl = getJoinUrl(appointment.meetingUrl);
        if (!joinUrl) return;
        window.open(joinUrl, '_blank', 'noopener,noreferrer');
    }, []);

    const handleUpdateStatus = React.useCallback(async (appointmentId: string, nextStatus: Extract<DashboardStatusKey, 'checked_in' | 'confirmed' | 'completed' | 'cancelled'>) => {
        if (!activeUser) {
            setError('Please sign in again to update appointments.');
            return;
        }

        setMutatingAppointmentId(appointmentId);
        setError(null);

        try {
            const headers = await buildHeaders(activeUser);
            const response = await fetch(`/api/dashboard/appointments/${appointmentId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: nextStatus })
            });
            const payload = await response.json() as {
                success?: boolean;
                appointment?: { statusKey: DashboardStatusKey; statusLabel: string };
                error?: string;
            };

            if (!response.ok || !payload.success || !payload.appointment) {
                throw new Error(payload.error || 'Failed to update appointment status.');
            }

            setAppointments((currentAppointments) => currentAppointments.map((appointment) => (
                appointment.id === appointmentId
                    ? {
                        ...appointment,
                        statusKey: payload.appointment!.statusKey,
                        statusLabel: payload.appointment!.statusLabel
                    }
                    : appointment
            )));
            setSelectedAppointment((currentAppointment) => (
                currentAppointment?.id === appointmentId
                    ? {
                        ...currentAppointment,
                        statusKey: payload.appointment!.statusKey,
                        statusLabel: payload.appointment!.statusLabel
                    }
                    : currentAppointment
            ));
        } catch (updateError) {
            const message = updateError instanceof Error ? updateError.message : 'Failed to update appointment status.';
            setError(message);
        } finally {
            setMutatingAppointmentId(null);
        }
    }, [activeUser]);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-40 rounded-3xl bg-white border border-slate-200" />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(320px,1fr)]">
                    <div className="space-y-4">
                        <div className="h-12 rounded-2xl bg-white border border-slate-200" />
                        <div className="h-28 rounded-2xl bg-white border border-slate-200" />
                        <div className="h-28 rounded-2xl bg-white border border-slate-200" />
                        <div className="h-28 rounded-2xl bg-white border border-slate-200" />
                    </div>
                    <div className="space-y-4">
                        <div className="h-56 rounded-2xl bg-white border border-slate-200" />
                        <div className="h-72 rounded-2xl bg-white border border-slate-200" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-8">
            <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-8 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl space-y-3">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Provider Dashboard</p>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900">Welcome back, {providerName}</h2>
                        <p className="max-w-xl text-sm leading-6 text-slate-600">
                            Real-time schedule, waitlist, and patient message activity for your current provider account.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => window.open('https://doxy.me/sign-in', '_blank', 'noopener,noreferrer')}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-brand-600"
                        >
                            <Video className="h-4 w-4" />
                            Open Waiting Room
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (activeUser) {
                                    loadDashboard(activeUser, { silent: true }).catch(() => undefined);
                                }
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                    <MetricCard label="Upcoming" value={counts.Upcoming} tone="indigo" />
                    <MetricCard label="Waitlist" value={counts.Waitlist} tone="violet" />
                    <MetricCard label="Completed" value={counts.Completed} tone="slate" />
                    <MetricCard label="Unread Messages" value={unreadMessageCount} tone="amber" />
                </div>
            </section>

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {error}
                </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr),minmax(320px,1fr)]">
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200">
                        {DASHBOARD_TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`border-b-2 px-1 pb-3 text-sm font-bold transition ${activeTab === tab
                                    ? 'border-brand text-brand'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                <span>{tab}</span>
                                <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {counts[tab]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {filteredAppointments.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                                <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-600">No {activeTab.toLowerCase()} items right now.</p>
                            </div>
                        ) : (
                            filteredAppointments.map((appointment) => (
                                <button
                                    key={appointment.id}
                                    type="button"
                                    onClick={() => setSelectedAppointment(appointment)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand/30 hover:shadow-md"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-bold text-slate-900">{appointment.patient}</h3>
                                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusTone(appointment.statusKey)}`}>
                                                    {appointment.statusLabel}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-600">{appointment.type}</p>
                                            <p className="text-sm text-slate-500">
                                                {appointment.statusKey === 'waitlist'
                                                    ? `Submitted ${formatTimestamp(appointment.submittedAt, 'recently')}`
                                                    : `${appointment.displayTime}${appointment.startAt ? ` • ${formatDateLabel(appointment.startAt, '')}` : ''}`}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {appointment.statusKey !== 'waitlist' && getJoinUrl(appointment.meetingUrl) && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleJoin(appointment);
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
                                                >
                                                    <Video className="h-3.5 w-3.5" />
                                                    Join
                                                </button>
                                            )}
                                            {appointment.statusKey === 'waitlist' && (
                                                <Link
                                                    href="/waitlist"
                                                    onClick={(event) => event.stopPropagation()}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                                >
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    Open Waitlist
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </section>

                <aside className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Weekly Volume</h3>
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand">
                                <Activity className="h-3 w-3" />
                                {counts.Upcoming + counts.Completed} visits
                            </span>
                        </div>

                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyVolume}>
                                    <defs>
                                        <linearGradient id="dashboardVolumeFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#cbd5e1' }}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="visits"
                                        stroke="#4F46E5"
                                        strokeWidth={2.5}
                                        fill="url(#dashboardVolumeFill)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Messages</h3>
                                <p className="mt-1 text-sm font-semibold text-slate-700">{unreadMessageCount} unread</p>
                            </div>
                            <Link href="/inbox" className="text-xs font-bold text-brand hover:underline">
                                View all
                            </Link>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {messages.length === 0 ? (
                                <div className="px-5 py-12 text-center">
                                    <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                                    <p className="text-sm font-medium text-slate-500">No recent patient messages.</p>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <Link
                                        key={message.id}
                                        href="/inbox"
                                        className={`block px-5 py-4 transition hover:bg-slate-50 ${message.unread ? 'bg-indigo-50/40' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className={`truncate text-sm ${message.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                    {message.sender}
                                                </p>
                                                <p className="mt-1 truncate text-xs text-slate-500">{message.preview}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-[11px] font-semibold text-slate-400">{message.time}</p>
                                                {message.unread && (
                                                    <span className="mt-1 inline-flex rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                        {message.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {selectedAppointment && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedAppointment(null);
                        }
                    }}
                >
                    <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Appointment</p>
                                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{selectedAppointment.patient}</h3>
                                <p className="mt-1 text-sm font-medium text-slate-500">{selectedAppointment.type}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAppointment(null)}
                                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-6 px-6 py-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <DetailCard
                                    label={selectedAppointment.statusKey === 'waitlist' ? 'Submitted' : 'Scheduled For'}
                                    value={selectedAppointment.statusKey === 'waitlist'
                                        ? formatTimestamp(selectedAppointment.submittedAt, 'Recently')
                                        : formatTimestamp(selectedAppointment.startAt, selectedAppointment.displayTime)}
                                    icon={<Clock3 className="h-4 w-4 text-brand" />}
                                />
                                <DetailCard
                                    label="Status"
                                    value={selectedAppointment.statusLabel}
                                    icon={<CheckCircle2 className="h-4 w-4 text-brand" />}
                                />
                            </div>

                            <DetailCard
                                label="Notes"
                                value={selectedAppointment.notes ?? 'No clinical notes attached yet.'}
                                icon={<MessageSquare className="h-4 w-4 text-brand" />}
                            />

                            <div className="flex flex-wrap gap-3">
                                {selectedAppointment.statusKey !== 'waitlist' && getJoinUrl(selectedAppointment.meetingUrl) && (
                                    <button
                                        type="button"
                                        onClick={() => handleJoin(selectedAppointment)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
                                    >
                                        <Video className="h-4 w-4" />
                                        Join Session
                                    </button>
                                )}

                                {selectedAppointment.statusKey === 'waitlist' && (
                                    <Link
                                        href="/waitlist"
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        <Calendar className="h-4 w-4" />
                                        Open Waitlist
                                    </Link>
                                )}

                                {selectedAppointment.statusKey !== 'waitlist' && selectedAppointment.statusKey !== 'completed' && selectedAppointment.statusKey !== 'cancelled' && (
                                    <>
                                        <StatusActionButton
                                            label="Confirm"
                                            onClick={() => handleUpdateStatus(selectedAppointment.id, 'confirmed')}
                                            loading={mutatingAppointmentId === selectedAppointment.id}
                                        />
                                        <StatusActionButton
                                            label="Check In"
                                            onClick={() => handleUpdateStatus(selectedAppointment.id, 'checked_in')}
                                            loading={mutatingAppointmentId === selectedAppointment.id}
                                        />
                                        <StatusActionButton
                                            label="Complete"
                                            onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                                            loading={mutatingAppointmentId === selectedAppointment.id}
                                        />
                                        <StatusActionButton
                                            label="Cancel"
                                            onClick={() => handleUpdateStatus(selectedAppointment.id, 'cancelled')}
                                            loading={mutatingAppointmentId === selectedAppointment.id}
                                            destructive
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'indigo' | 'violet' | 'slate' | 'amber' }) {
    const toneClass = tone === 'violet'
        ? 'bg-violet-50 border-violet-100 text-violet-700'
        : tone === 'slate'
            ? 'bg-slate-100 border-slate-200 text-slate-700'
            : tone === 'amber'
                ? 'bg-amber-50 border-amber-100 text-amber-700'
                : 'bg-indigo-50 border-indigo-100 text-indigo-700';

    return (
        <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</p>
            <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
        </div>
    );
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                {icon}
                <span>{label}</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{value}</p>
        </div>
    );
}

function StatusActionButton({
    label,
    onClick,
    loading,
    destructive
}: {
    label: string;
    onClick: () => void;
    loading: boolean;
    destructive?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${destructive
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:cursor-not-allowed disabled:opacity-60`}
        >
            {loading ? 'Saving...' : label}
        </button>
    );
}
