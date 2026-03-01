"use client";

import { Bell, Check, Clock3, MoreHorizontal, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/lib/notification-types';

function toRelativeTime(isoString: string): string {
    const value = new Date(isoString);
    if (Number.isNaN(value.getTime())) return 'now';

    const delta = Date.now() - value.getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (delta < minute) return 'just now';
    if (delta < hour) return `${Math.floor(delta / minute)}m ago`;
    if (delta < day) return `${Math.floor(delta / hour)}h ago`;

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value);
}

function NotificationRow({
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
        <div className={`rounded-lg border px-3 py-3 ${notification.read ? 'border-slate-200 dark:border-slate-700' : 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-900/20'}`}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{notification.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{notification.body}</p>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {toRelativeTime(notification.createdAt)}
                    </span>
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((previous) => !previous)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Notification options"
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-7 z-20 w-36 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
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
                                    className="w-full px-3 py-2 text-left text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
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
                                    className="w-full px-3 py-2 text-left text-[11px] font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
                {notification.type === 'team_invite' && notification.actionStatus === 'pending' && (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                void onRespond(notification.id, 'accept');
                            }}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
                        >
                            Accept
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                void onRespond(notification.id, 'reject');
                            }}
                            className="rounded-md bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                        >
                            Reject
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

interface ProviderNotificationBellProps {
    viewAllHref?: string;
}

export function ProviderNotificationBell({ viewAllHref = '/notifications' }: ProviderNotificationBellProps) {
    const [open, setOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement | null>(null);

    const {
        notifications,
        unreadCount,
        error,
        markRead,
        markUnread,
        deleteNotification,
        respondToTeamInvite
    } = useNotifications({
        limit: 8,
        toastOnNew: true
    });

    const hasItems = notifications.length > 0;
    const bellLabel = useMemo(() => {
        if (unreadCount <= 0) return 'Notifications';
        if (unreadCount === 1) return '1 unread notification';
        return `${unreadCount} unread notifications`;
    }, [unreadCount]);

    useEffect(() => {
        if (!error) return;
        toast.error(error);
    }, [error]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!popoverRef.current) return;
            if (!popoverRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={popoverRef}>
            <button
                type="button"
                aria-label={bellLabel}
                onClick={() => setOpen((previous) => !previous)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors relative hover:text-brand"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white dark:border-slate-800">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{bellLabel}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto p-3 space-y-2">
                        {!hasItems && (
                            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-6 text-center">
                                <Clock3 className="h-4 w-4 mx-auto text-slate-400" />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">No notifications yet.</p>
                            </div>
                        )}

                        {notifications.map((notification) => (
                            <NotificationRow
                                key={notification.id}
                                notification={notification}
                                onMarkRead={markRead}
                                onMarkUnread={markUnread}
                                onDelete={deleteNotification}
                                onRespond={respondToTeamInvite}
                            />
                        ))}
                    </div>

                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                        <Link
                            href={viewAllHref}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                        >
                            View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
