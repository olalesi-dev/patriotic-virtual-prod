"use client";

import { Bell, Check, ExternalLink, Inbox, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/lib/notification-types';

type NotificationFilter = 'all' | 'unread';

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
    const metadataTeamName = typeof notification.metadata.teamName === 'string'
        ? notification.metadata.teamName
        : null;

    return (
        <article className={`rounded-xl border p-4 shadow-sm ${notification.read ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' : 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-900/20'}`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.body}</p>
                    {metadataTeamName && (
                        <p className="mt-2 inline-flex rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-200">
                            Team: {metadataTeamName}
                        </p>
                    )}
                </div>
                <time className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" dateTime={notification.createdAt}>
                    {toReadableTime(notification.createdAt)}
                </time>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        if (notification.read) {
                            void onMarkUnread(notification.id);
                        } else {
                            void onMarkRead(notification.id);
                        }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                    <Check className="h-3.5 w-3.5" />
                    {notification.read ? 'Mark unread' : 'Mark read'}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        void onDelete(notification.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 dark:border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>

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
                            Review system updates, appointment events, and team invitations.
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
