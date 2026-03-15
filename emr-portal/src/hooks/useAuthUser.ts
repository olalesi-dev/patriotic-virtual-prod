"use client";

import * as React from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useAuthUser() {
    const [user, setUser] = React.useState<FirebaseUser | null>(auth.currentUser);
    const [isReady, setIsReady] = React.useState(Boolean(auth.currentUser));

    React.useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((nextUser) => {
            setUser(nextUser);
            setIsReady(true);
        });

        return () => unsubscribe();
    }, []);

    return {
        user,
        isReady
    };
}
