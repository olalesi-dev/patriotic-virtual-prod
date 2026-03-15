"use client";

import { Moon, Sun } from 'lucide-react';
import * as React from 'react';
import {
    applyThemeMode,
    readStoredThemeMode,
    resolveThemeMode,
    USER_PREFERENCES_UPDATED_EVENT
} from '@/lib/user-preferences';

export function ThemeToggle() {
    const [themeMode, setThemeMode] = React.useState<'light' | 'dark' | 'system'>('system');
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        const sync = () => {
            const currentMode = readStoredThemeMode();
            setThemeMode(currentMode);
            const resolved = resolveThemeMode(currentMode);
            if (resolved === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            setMounted(true);
        };

        sync();

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handlePreferenceChange = () => {
            sync();
        };
        const handleSystemThemeChange = () => {
            if (readStoredThemeMode() === 'system') {
                sync();
            }
        };

        window.addEventListener(USER_PREFERENCES_UPDATED_EVENT, handlePreferenceChange);
        media.addEventListener('change', handleSystemThemeChange);

        return () => {
            window.removeEventListener(USER_PREFERENCES_UPDATED_EVENT, handlePreferenceChange);
            media.removeEventListener('change', handleSystemThemeChange);
        };
    }, []);

    const toggleTheme = () => {
        const currentResolvedTheme = resolveThemeMode(themeMode);
        const nextMode = currentResolvedTheme === 'dark' ? 'light' : 'dark';
        applyThemeMode(nextMode);
        setThemeMode(nextMode);
    };

    if (!mounted) {
        return <div className="w-9 h-9"></div>; // Placeholder to avoid hydration mismatch
    }

    const resolvedTheme = resolveThemeMode(themeMode);

    return (
        <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Toggle Theme"
        >
            {resolvedTheme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
    );
}
