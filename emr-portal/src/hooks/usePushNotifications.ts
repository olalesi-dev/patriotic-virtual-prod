"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiFetchJson } from '@/lib/api-client';
import { getFirebaseMessaging } from '@/lib/firebase-messaging';

const FIREBASE_MESSAGING_SW_PATH = '/firebase-messaging-sw.js';

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

export function usePushNotifications(activeUser: FirebaseUser | null) {
    const currentTokenRef = useRef<string | null>(null);
    const inFlightTokenRef = useRef<string | null>(null);
    const unsubscribeForegroundRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!activeUser) {
            if (unsubscribeForegroundRef.current) {
                unsubscribeForegroundRef.current();
                unsubscribeForegroundRef.current = null;
            }
            currentTokenRef.current = null;
            inFlightTokenRef.current = null;
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
                if (currentTokenRef.current === token || inFlightTokenRef.current === token) return;

                inFlightTokenRef.current = token;

                if (currentTokenRef.current && currentTokenRef.current !== token) {
                    await apiFetchJson<{ success?: boolean; error?: string }>('/api/notifications/push-token', {
                        method: 'DELETE',
                        user: activeUser,
                        body: { token: currentTokenRef.current }
                    });
                }

                await apiFetchJson<{ success?: boolean; error?: string }>('/api/notifications/push-token', {
                    method: 'POST',
                    user: activeUser,
                    body: { token }
                });

                currentTokenRef.current = token;
                inFlightTokenRef.current = null;

                if (unsubscribeForegroundRef.current) {
                    unsubscribeForegroundRef.current();
                }

                unsubscribeForegroundRef.current = onMessage(messaging, (payload) => {
                    const title = asNonEmptyString(payload.notification?.title) ?? 'New notification';
                    const body = asNonEmptyString(payload.notification?.body) ?? 'You have a new update.';

                    toast.message(title, { description: body });
                });
            } catch (error) {
                inFlightTokenRef.current = null;
                console.error('Push notification setup failed:', error);
            }
        };

        void syncPushToken();

        return () => {
            cancelled = true;
        };
    }, [activeUser]);
}
