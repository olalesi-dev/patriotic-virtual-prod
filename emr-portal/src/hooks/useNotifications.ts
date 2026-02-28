"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import {
    collection,
    onSnapshot,
    query,
    where
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { auth, db } from '@/lib/firebase';
import type {
    AppNotification,
    AppNotificationType,
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
    if (normalized === 'team_invite') return 'team_invite';
    if (normalized === 'team_invite_response') return 'team_invite_response';
    if (normalized === 'appointment_rescheduled') return 'appointment_rescheduled';
    if (normalized === 'appointment_cancelled') return 'appointment_cancelled';
    return 'appointment_booked';
}

function normalizeActionStatus(value: unknown): NotificationActionStatus {
    const normalized = asString(value);
    if (normalized === 'pending') return 'pending';
    if (normalized === 'accepted') return 'accepted';
    if (normalized === 'rejected') return 'rejected';
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
        metadata: toMetadata(data.metadata)
    };
}

function sortNotifications(items: AppNotification[]): AppNotification[] {
    return [...items].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

async function buildAuthHeaders(activeUser: FirebaseUser): Promise<Record<string, string>> {
    const idToken = await activeUser.getIdToken();
    return {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
    };
}

export function useNotifications(options: UseNotificationsOptions = {}) {
    const { limit = 30, toastOnNew = false } = options;

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [activeUser, setActiveUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hydratedRef = useRef(false);

    const unreadCount = notifications.reduce((total, notification) => (
        notification.read ? total : total + 1
    ), 0);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            hydratedRef.current = false;
            setActiveUser(user);
            if (!user) {
                setNotifications([]);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!activeUser) return;

        setLoading(true);
        setError(null);

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
            setLoading(false);
        }, (snapshotError) => {
            console.error('Notifications listener error:', snapshotError);
            setError('Unable to subscribe to notifications.');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeUser, limit, toastOnNew]);

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
            const headers = await buildAuthHeaders(activeUser);
            const response = await fetch(`/api/notifications/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ action: read ? 'mark_read' : 'mark_unread' })
            });

            const payload = await response.json() as NotificationApiResponse;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to update notification.');
            }
            return true;
        } catch (updateError) {
            const message = updateError instanceof Error ? updateError.message : 'Failed to update notification.';
            setNotifications(previous);
            setError(message);
            return false;
        }
    }, [activeUser, notifications]);

    const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
        if (!activeUser) {
            setError('Please sign in again to update notifications.');
            return false;
        }

        const previous = notifications;
        setNotifications((current) => current.filter((notification) => notification.id !== id));

        try {
            const headers = await buildAuthHeaders(activeUser);
            const response = await fetch(`/api/notifications/${id}`, {
                method: 'DELETE',
                headers
            });

            const payload = await response.json() as NotificationApiResponse;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to delete notification.');
            }
            return true;
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete notification.';
            setNotifications(previous);
            setError(message);
            return false;
        }
    }, [activeUser, notifications]);

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
            const headers = await buildAuthHeaders(activeUser);
            const response = await fetch(`/api/notifications/${id}/respond`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ decision })
            });

            const payload = await response.json() as NotificationApiResponse;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to respond to invitation.');
            }
            return true;
        } catch (respondError) {
            const message = respondError instanceof Error ? respondError.message : 'Failed to respond to invitation.';
            setNotifications(previous);
            setError(message);
            return false;
        }
    }, [activeUser, notifications]);

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
