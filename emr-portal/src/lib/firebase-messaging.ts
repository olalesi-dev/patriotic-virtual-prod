"use client";

import type { Messaging } from 'firebase/messaging';
import { getMessaging, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase';

let messagingPromise: Promise<Messaging | null> | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!messagingPromise) {
        messagingPromise = isSupported()
            .then((supported) => (supported ? getMessaging(app) : null))
            .catch(() => null);
    }

    return messagingPromise;
}
