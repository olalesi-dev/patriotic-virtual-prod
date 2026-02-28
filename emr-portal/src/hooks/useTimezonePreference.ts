"use client";

import { useEffect, useState } from 'react';
import { getBrowserTimeZone } from '@/lib/settings';
import { readStoredTimezone, USER_PREFERENCES_UPDATED_EVENT } from '@/lib/user-preferences';

export function useTimezonePreference() {
    const [timezone, setTimezone] = useState<string>(() => readStoredTimezone() ?? getBrowserTimeZone());

    useEffect(() => {
        const sync = () => {
            setTimezone(readStoredTimezone() ?? getBrowserTimeZone());
        };

        sync();
        window.addEventListener(USER_PREFERENCES_UPDATED_EVENT, sync);

        return () => {
            window.removeEventListener(USER_PREFERENCES_UPDATED_EVENT, sync);
        };
    }, []);

    return timezone;
}
