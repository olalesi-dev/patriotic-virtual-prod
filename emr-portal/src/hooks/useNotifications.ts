"use client";

import { useMutation } from '@tanstack/react-query';
import {
    collection,
    onSnapshot,
    query,
    where
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuthUser } from '@/hooks/useAuthUser';
import { apiFetchJson } from '@/lib/api-client';
import { db } from '@/lib/firebase';
import type {
    AppNotification,
    AppNotificationType,
    NotificationPriority,
    NotificationActionStatus
} from '@/lib/notification-types';

interface UseNotificationsOptions {
    limit?: number;
    toastOnNew?: boolean;
}

interface NotificationApiResponse {
    success?: boolean;
    error?: string;
}

interface NotificationListApiResponse extends NotificationApiResponse {
    notifications?: AppNotification[];
    unreadCount?: number;
}

function asString(value: unknown): string | null {
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

function toMetadata(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

function normalizeNotificationType(value: unknown): AppNotificationType {
    const normalized = asString(value);
    if (normalized === 'account_created') return 'account_created';
    if (normalized === 'appointment_request') return 'appointment_request';
    if (normalized === 'team_invite') return 'team_invite';
    if (normalized === 'team_invite_response') return 'team_invite_response';
    if (normalized === 'message_received') return 'message_received';
    if (normalized === 'appointment_reminder') return 'appointment_reminder';
    if (normalized === 'appointment_rescheduled') return 'appointment_rescheduled';
    if (normalized === 'appointment_cancelled') return 'appointment_cancelled';
    if (normalized === 'dosespot_rx_counts') return 'dosespot_rx_counts';
    if (normalized === 'dosespot_rx_error') return 'dosespot_rx_error';
    if (normalized === 'dosespot_medication_status') return 'dosespot_medication_status';
    if (normalized === 'dosespot_prior_auth') return 'dosespot_prior_auth';
    if (normalized === 'dosespot_pharmacy_transfer') return 'dosespot_pharmacy_transfer';
    if (normalized === 'dosespot_clinician_security') return 'dosespot_clinician_security';
    if (normalized === 'dosespot_sync_update') return 'dosespot_sync_update';
    return 'appointment_booked';
}

function normalizeActionStatus(value: unknown): NotificationActionStatus {
    const normalized = asString(value);
    if (normalized === 'pending') return 'pending';
    if (normalized === 'accepted') return 'accepted';
    if (normalized === 'rejected') return 'rejected';
    return null;
}

function normalizePriority(value: unknown): NotificationPriority {
    const normalized = asString(value);
    if (normalized === 'low') return 'low';
    if (normalized === 'medium') return 'medium';
    if (normalized === 'high') return 'high';
    return null;
}

function normalizeSource(value: unknown): AppNotification['source'] {
    const normalized = asString(value);
    if (normalized === 'dosespot') return 'dosespot';
    if (normalized === 'app') return 'app';
    return null;
}

function mapNotification(
    id: string,
    data: Record<string, unknown>
): AppNotification {
    const createdAt = asDate(data.createdAt) ?? new Date();
    const updatedAt = asDate(data.updatedAt) ?? createdAt;

    return {
        id,
        recipientId: asString(data.recipientId) ?? '',
        actorId: asString(data.actorId),
        actorName: asString(data.actorName),
        type: normalizeNotificationType(data.type),
        title: asString(data.title) ?? 'Notification',
        body: asString(data.body) ?? '',
        href: asString(data.href),
        read: data.read === true,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        actionStatus: normalizeActionStatus(data.actionStatus),
        priority: normalizePriority(data.priority),
        source: normalizeSource(data.source),
        metadata: toMetadata(data.metadata)
    };
}

function sortNotifications(items: AppNotification[]): AppNotification[] {
    return [...items].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export function useNotifications(options: UseNotificationsOptions = {}) {
    const { limit = 30, toastOnNew = false } = options;

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const { user: activeUser, isReady } = useAuthUser();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hydratedRef = useRef(false);
    const notificationMutation = useMutation({
        mutationFn: ({
            path,
            method,
            body
        }: {
            path: string;
            method: 'PATCH' | 'DELETE' | 'POST';
            body?: Record<string, unknown>;
        }) => {
            if (!activeUser) {
                throw new Error('Please sign in again to update notifications.');
            }

            return apiFetchJson<NotificationApiResponse>(path, {
                method,
                user: activeUser,
                body
            });
        }
    });
    const mutateNotification = notificationMutation.mutateAsync;

    const unreadCount = notifications.reduce((total, notification) => (
        notification.read ? total : total + 1
    ), 0);

    useEffect(() => {
        hydratedRef.current = false;
        if (!isReady) return;
        if (!activeUser) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        let pollTimer: ReturnType<typeof setInterval> | null = null;

        const fetchByApi = async () => {
            try {
                const payload = await apiFetchJson<NotificationListApiResponse>(`/api/notifications?limit=${Math.max(1, limit)}`, {
                    method: 'GET',
                    user: activeUser,
                    cache: 'no-store'
                });

                if (!payload.success) {
                    throw new Error(payload.error || 'Failed to load notifications.');
                }

                const nextItems = sortNotifications(
                    Array.isArray(payload.notifications)
                        ? payload.notifications
                        : []
                ).slice(0, Math.max(1, limit));
                setNotifications(nextItems);
                setError(null);
                setLoading(false);
            } catch (apiError) {
                const message = apiError instanceof Error ? apiError.message : 'Failed to load notifications.';
                setError(message);
                setLoading(false);
            }
        };

        const startPollingFallback = () => {
            if (pollTimer) return;
            void fetchByApi();
            pollTimer = setInterval(() => {
                void fetchByApi();
            }, 15_000);
        };

        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('recipientId', '==', activeUser.uid)
        );

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const mapped = sortNotifications(snapshot.docs
                .map((notificationDoc) => mapNotification(notificationDoc.id, notificationDoc.data() as Record<string, unknown>)))
                .slice(0, Math.max(1, limit));

            if (toastOnNew && hydratedRef.current) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type !== 'added') return;
                    const data = mapNotification(change.doc.id, change.doc.data() as Record<string, unknown>);
                    if (!data.read) {
                        toast.message(data.title, {
                            description: data.body || 'You have a new notification.'
                        });
                    }
                });
            }

            hydratedRef.current = true;
            setNotifications(mapped);
            setError(null);
            setLoading(false);
        }, (snapshotError) => {
            if ((snapshotError as { code?: string })?.code === 'permission-denied') {
                console.warn('Realtime notifications disabled by Firestore rules; using API polling fallback.');
                setError(null);
                startPollingFallback();
                return;
            }
            console.error('Notifications listener error:', snapshotError);
            setError('Unable to subscribe to notifications.');
            startPollingFallback();
        });

        return () => {
            unsubscribe();
            if (pollTimer) {
                clearInterval(pollTimer);
            }
        };
    }, [activeUser, isReady, limit, toastOnNew]);

    const updateNotificationReadState = useCallback(async (id: string, read: boolean): Promise<boolean> => {
        if (!activeUser) {
            setError('Please sign in again to update notifications.');
            return false;
        }

        const previous = notifications;
        setNotifications((current) => current.map((notification) => (
            notification.id === id
                ? { ...notification, read }
                : notification
        )));

        try {
            const payload = await mutateNotification({
                path: `/api/notifications/${id}`,
                method: 'PATCH',
                body: { action: read ? 'mark_read' : 'mark_unread' }
            });
            if (!payload.success) {
                throw new Error(payload.error || 'Failed to update notification.');
            }
            return true;
        } catch (updateError) {
            const message = updateError instanceof Error ? updateError.message : 'Failed to update notification.';
            setNotifications(previous);
            setError(message);
            return false;
        }
    }, [activeUser, notifications, mutateNotification]);

    const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
        if (!activeUser) {
            setError('Please sign in again to update notifications.');
            return false;
        }

        const previous = notifications;
        setNotifications((current) => current.filter((notification) => notification.id !== id));

        try {
            const payload = await mutateNotification({
                path: `/api/notifications/${id}`,
                method: 'DELETE'
            });
            if (!payload.success) {
                throw new Error(payload.error || 'Failed to delete notification.');
            }
            return true;
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete notification.';
            setNotifications(previous);
            setError(message);
            return false;
        }
    }, [activeUser, notifications, mutateNotification]);

    const respondToTeamInvite = useCallback(async (
        id: string,
        decision: 'accept' | 'reject'
    ): Promise<boolean> => {
        if (!activeUser) {
            setError('Please sign in again to respond to invitations.');
            return false;
        }

        const previous = notifications;
        setNotifications((current) => current.map((notification) => {
            if (notification.id !== id) return notification;
            return {
                ...notification,
                actionStatus: decision === 'accept' ? 'accepted' : 'rejected',
                read: true
            };
        }));

        try {
            const payload = await mutateNotification({
                path: `/api/notifications/${id}/respond`,
                method: 'POST',
                body: { decision }
            });
            if (!payload.success) {
                throw new Error(payload.error || 'Failed to respond to invitation.');
            }
            return true;
        } catch (respondError) {
            const message = respondError instanceof Error ? respondError.message : 'Failed to respond to invitation.';
            setNotifications(previous);
            setError(message);
            return false;
        }
    }, [activeUser, notifications, mutateNotification]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        setError,
        markRead: (id: string) => updateNotificationReadState(id, true),
        markUnread: (id: string) => updateNotificationReadState(id, false),
        deleteNotification,
        respondToTeamInvite
    };
}
