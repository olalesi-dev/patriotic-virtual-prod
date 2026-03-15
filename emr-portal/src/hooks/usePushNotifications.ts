"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getFirebaseMessaging } from '@/lib/firebase-messaging';

const FIREBASE_MESSAGING_SW_PATH = '/firebase-messaging-sw.js';

async function buildAuthHeaders(activeUser: FirebaseUser): Promise<Record<string, string>> {
    const idToken = await activeUser.getIdToken();
    return {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
    };
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

export function usePushNotifications(activeUser: FirebaseUser | null) {
    const currentTokenRef = useRef<string | null>(null);
    const unsubscribeForegroundRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!activeUser) {
            if (unsubscribeForegroundRef.current) {
                unsubscribeForegroundRef.current();
                unsubscribeForegroundRef.current = null;
            }
            currentTokenRef.current = null;
            return;
        }

        if (typeof window === 'undefined') return;
        if (!window.isSecureContext) return;
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.warn('Push notifications disabled: NEXT_PUBLIC_FIREBASE_VAPID_KEY is not configured.');
            return;
        }

        let cancelled = false;

        const syncPushToken = async () => {
            try {
                const messaging = await getFirebaseMessaging();
                if (!messaging || cancelled) return;

                let permission = Notification.permission;
                if (permission === 'default') {
                    permission = await Notification.requestPermission();
                }
                if (permission !== 'granted' || cancelled) return;

                const serviceWorkerRegistration = await navigator.serviceWorker.register(FIREBASE_MESSAGING_SW_PATH, {
                    scope: '/'
                });
                if (cancelled) return;

                const token = await getToken(messaging, {
                    vapidKey,
                    serviceWorkerRegistration
                });

                if (!token || cancelled) return;

                const headers = await buildAuthHeaders(activeUser);

                if (currentTokenRef.current && currentTokenRef.current !== token) {
                    await fetch('/api/notifications/push-token', {
                        method: 'DELETE',
                        headers,
                        body: JSON.stringify({ token: currentTokenRef.current })
                    });
                }

                if (currentTokenRef.current !== token) {
                    const response = await fetch('/api/notifications/push-token', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ token })
                    });

                    if (!response.ok) {
                        const payload = await response.json() as { error?: string };
                        throw new Error(payload.error || 'Failed to register push token.');
                    }
                }

                currentTokenRef.current = token;

                if (unsubscribeForegroundRef.current) {
                    unsubscribeForegroundRef.current();
                }

                unsubscribeForegroundRef.current = onMessage(messaging, (payload) => {
                    const title = asNonEmptyString(payload.notification?.title) ?? 'New notification';
                    const body = asNonEmptyString(payload.notification?.body) ?? 'You have a new update.';

                    toast.message(title, { description: body });
                });
            } catch (error) {
                console.error('Push notification setup failed:', error);
            }
        };

        void syncPushToken();

        return () => {
            cancelled = true;
        };
    }, [activeUser]);
}
