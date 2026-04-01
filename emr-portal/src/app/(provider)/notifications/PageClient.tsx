"use client";

import { Bell, Check, ExternalLink, Inbox, MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useNotifications } from '@/hooks/useNotifications';
import { apiFetchJson } from '@/lib/api-client';
import { getDoseSpotApiUrl } from '@/lib/dosespot-client';
import type { AppNotification } from '@/lib/notification-types';

type NotificationFilter = 'all' | 'unread';

interface DoseSpotQueueCounts {
    pendingPrescriptions: number;
    transmissionErrors: number;
    refillRequests: number;
    changeRequests: number;
    total: number;
}

function asCount(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.trunc(value));
}

function toReadableTime(isoString: string): string {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'Unknown time';

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(date);
}

function priorityClasses(priority: AppNotification['priority']): string {
    if (priority === 'high') {
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200';
    }
    if (priority === 'medium') {
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
    }
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

function NotificationCard({
    notification,
    onMarkRead,
    onMarkUnread,
    onDelete,
    onRespond
}: {
    notification: AppNotification;
    onMarkRead: (id: string) => Promise<boolean>;
    onMarkUnread: (id: string) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
    onRespond: (id: string, decision: 'accept' | 'reject') => Promise<boolean>;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const metadataTeamName = typeof notification.metadata.teamName === 'string'
        ? notification.metadata.teamName
        : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <article className={`rounded-xl border p-4 shadow-sm ${notification.read ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' : 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-900/20'}`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        {notification.source === 'dosespot' && (
                            <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:bg-teal-900/30 dark:text-teal-200">
                                DoseSpot
                            </span>
                        )}
                        {notification.priority && (
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${priorityClasses(notification.priority)}`}>
                                {notification.priority}
                            </span>
                        )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.body}</p>
                    {metadataTeamName && (
                        <p className="mt-2 inline-flex rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-200">
                            Team: {metadataTeamName}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <time className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" dateTime={notification.createdAt}>
                        {toReadableTime(notification.createdAt)}
                    </time>
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((previous) => !previous)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            aria-label="Notification options"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-8 z-20 w-40 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        if (notification.read) {
                                            void onMarkUnread(notification.id);
                                        } else {
                                            void onMarkRead(notification.id);
                                        }
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    {notification.read ? 'Mark unread' : 'Mark read'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        void onDelete(notification.id);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                {notification.href && (
                    <Link
                        href={notification.href}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        Open <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                )}

                {notification.type === 'team_invite' && notification.actionStatus === 'pending' && (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                void onRespond(notification.id, 'accept').then((ok) => {
                                    if (ok) toast.success('Team invitation accepted.');
                                });
                            }}
                            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                            Accept
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                void onRespond(notification.id, 'reject').then((ok) => {
                                    if (ok) toast.success('Team invitation rejected.');
                                });
                            }}
                            className="inline-flex items-center rounded-md bg-slate-200 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600"
                        >
                            Reject
                        </button>
                    </>
                )}
            </div>
        </article>
    );
}

export default function ProviderNotificationsPage() {
    const [filter, setFilter] = useState<NotificationFilter>('all');
    const { user: activeUser, isReady } = useAuthUser();
    const [doseSpotCounts, setDoseSpotCounts] = useState<DoseSpotQueueCounts | null>(null);
    const [doseSpotCountsLoading, setDoseSpotCountsLoading] = useState(false);
    const [doseSpotCountsError, setDoseSpotCountsError] = useState<string | null>(null);

    const {
        notifications,
        unreadCount,
        loading,
        error,
        markRead,
        markUnread,
        deleteNotification,
        respondToTeamInvite
    } = useNotifications({
        limit: 200,
        toastOnNew: false
    });

    useEffect(() => {
        if (!isReady) return;

        if (!activeUser) {
            setDoseSpotCounts(null);
            setDoseSpotCountsError(null);
            setDoseSpotCountsLoading(false);
            return;
        }

        let cancelled = false;
        setDoseSpotCountsLoading(true);

        const fetchCounts = async () => {
            try {
                const payload = await apiFetchJson<Partial<DoseSpotQueueCounts>>(
                    getDoseSpotApiUrl('/api/v1/dosespot/notification-count'),
                    {
                        method: 'GET',
                        user: activeUser,
                        cache: 'no-store'
                    }
                );

                if (cancelled) return;

                const counts: DoseSpotQueueCounts = {
                    pendingPrescriptions: asCount(payload.pendingPrescriptions),
                    transmissionErrors: asCount(payload.transmissionErrors),
                    refillRequests: asCount(payload.refillRequests),
                    changeRequests: asCount(payload.changeRequests),
                    total: asCount(payload.total)
                };

                setDoseSpotCounts(counts);
                setDoseSpotCountsError(null);
            } catch (countsError) {
                if (cancelled) return;
                const message = countsError instanceof Error ? countsError.message : 'Failed to load DoseSpot queue counts.';
                setDoseSpotCountsError(message);
            } finally {
                if (!cancelled) {
                    setDoseSpotCountsLoading(false);
                }
            }
        };

        void fetchCounts();
        const intervalId = setInterval(() => {
            void fetchCounts();
        }, 30_000);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [activeUser, isReady]);

    const visibleNotifications = useMemo(() => {
        if (filter === 'unread') {
            return notifications.filter((notification) => notification.read === false);
        }
        return notifications;
    }, [filter, notifications]);

    return (
        <div className="max-w-5xl space-y-6 pb-12">
            <header className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Review system updates, DoseSpot alerts, appointment events, and team invitations.
                        </p>
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('unread')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filter === 'unread' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>
                </div>

                {error && (
                    <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>
                )}
            </header>

            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-teal-100 dark:bg-teal-900/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-200">
                            DoseSpot Queue
                        </span>
                        {doseSpotCounts && doseSpotCounts.total > 0 && (
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 text-xs font-bold text-white">
                                {doseSpotCounts.total > 99 ? '99+' : doseSpotCounts.total}
                            </span>
                        )}
                    </div>

                    <Link
                        href="/orders/erx?refillsErrors=true"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        Open Queue Summary <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </div>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    Queue counts come from `PrescriberNotificationCounts` events and may not match the number of topic rows in this page.
                </p>

                {doseSpotCountsError && (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{doseSpotCountsError}</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</p>
                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                            {doseSpotCountsLoading && !doseSpotCounts ? '…' : (doseSpotCounts?.total ?? 0)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending</p>
                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{doseSpotCounts?.pendingPrescriptions ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transmission</p>
                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{doseSpotCounts?.transmissionErrors ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Refills</p>
                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{doseSpotCounts?.refillRequests ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">RxChange</p>
                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{doseSpotCounts?.changeRequests ?? 0}</p>
                    </div>
                </div>
            </section>

            {loading && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading notifications...</p>
                </div>
            )}

            {!loading && visibleNotifications.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
                    <Inbox className="w-6 h-6 mx-auto text-slate-400" />
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No notifications in this view.</p>
                </div>
            )}

            <section className="space-y-3">
                {visibleNotifications.map((notification) => (
                    <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markRead}
                        onMarkUnread={markUnread}
                        onDelete={deleteNotification}
                        onRespond={respondToTeamInvite}
                    />
                ))}
            </section>

            {!loading && notifications.length > 0 && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5" />
                    Live updates enabled for this page.
                </div>
            )}
        </div>
    );
}
