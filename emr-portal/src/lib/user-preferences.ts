import { isValidTimeZone, THEME_MODES, type ThemeMode } from '@/lib/settings';

export const USER_PREFERENCES_UPDATED_EVENT = 'emr:user-preferences-updated';

export const USER_PREFERENCE_STORAGE_KEYS = {
    timezone: 'emr.preferences.timezone',
    language: 'emr.preferences.language',
    themeMode: 'emr.preferences.themeMode'
} as const;

function canUseDom(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function safeGetItem(key: string): string | null {
    if (!canUseDom()) return null;
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSetItem(key: string, value: string) {
    if (!canUseDom()) return;
    try {
        window.localStorage.setItem(key, value);
    } catch {}
}

function dispatchPreferenceEvent() {
    if (!canUseDom()) return;
    window.dispatchEvent(new CustomEvent(USER_PREFERENCES_UPDATED_EVENT));
}

export function readStoredThemeMode(): ThemeMode {
    const raw = safeGetItem(USER_PREFERENCE_STORAGE_KEYS.themeMode);
    if (raw && (THEME_MODES as readonly string[]).includes(raw)) {
        return raw as ThemeMode;
    }

    const legacyTheme = safeGetItem('theme');
    if (legacyTheme === 'dark' || legacyTheme === 'light') {
        return legacyTheme;
    }

    return 'system';
}

export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
    if (!canUseDom()) {
        return mode === 'dark' ? 'dark' : 'light';
    }

    if (mode === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return mode === 'dark' ? 'dark' : 'light';
}

export function applyThemeMode(mode: ThemeMode) {
    if (!canUseDom()) return;

    const resolved = resolveThemeMode(mode);
    if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    safeSetItem(USER_PREFERENCE_STORAGE_KEYS.themeMode, mode);
    safeSetItem('theme', resolved);
    dispatchPreferenceEvent();
}

export function readStoredTimezone(): string | null {
    const value = safeGetItem(USER_PREFERENCE_STORAGE_KEYS.timezone);
    if (!value) return null;
    return isValidTimeZone(value) ? value : null;
}

export function readStoredLanguage(): string | null {
    return safeGetItem(USER_PREFERENCE_STORAGE_KEYS.language);
}

export function getEffectiveTimezone(defaultValue: string): string {
    return readStoredTimezone() ?? defaultValue;
}

export function persistUserPreferences(input: {
    timezone?: string;
    language?: string;
    themeMode?: ThemeMode;
}) {
    if (!canUseDom()) return;

    if (input.timezone && isValidTimeZone(input.timezone)) {
        safeSetItem(USER_PREFERENCE_STORAGE_KEYS.timezone, input.timezone);
    }

    if (input.language) {
        safeSetItem(USER_PREFERENCE_STORAGE_KEYS.language, input.language);
    }

    if (input.themeMode) {
        applyThemeMode(input.themeMode);
        return;
    }

    dispatchPreferenceEvent();
}
