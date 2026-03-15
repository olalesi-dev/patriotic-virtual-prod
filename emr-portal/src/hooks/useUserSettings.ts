"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
    normalizeSettings,
    type SettingsPatch,
    type SettingsRole,
    settingsPatchSchema,
    type UserSettings
} from '@/lib/settings';
import { persistUserPreferences } from '@/lib/user-preferences';

interface SettingsApiResponse {
    success: boolean;
    settings?: UserSettings;
    error?: string;
}

interface UseUserSettingsOptions {
    expectedRole?: SettingsRole;
}

function applyPatchOptimistically(current: UserSettings, patch: SettingsPatch): UserSettings {
    if (patch.section === 'profile') {
        return normalizeSettings({ ...current, profile: patch.value }, current);
    }
    if (patch.section === 'locale') {
        return normalizeSettings({ ...current, locale: patch.value }, current);
    }
    if (patch.section === 'theme') {
        return normalizeSettings({ ...current, theme: patch.value }, current);
    }
    if (patch.section === 'notifications') {
        return normalizeSettings({ ...current, notifications: patch.value }, current);
    }
    if (patch.section === 'connectedApps') {
        return normalizeSettings({ ...current, connectedApps: patch.value }, current);
    }
    if (patch.section === 'services' && current.role === 'provider') {
        return normalizeSettings({ ...current, services: patch.value }, current);
    }
    if (patch.section === 'availability' && current.role === 'provider') {
        return normalizeSettings({ ...current, availability: patch.value }, current);
    }

    return current;
}

function applyClientPreferences(settings: UserSettings) {
    persistUserPreferences({
        timezone: settings.locale.timezone,
        language: settings.locale.language,
        themeMode: settings.theme.mode
    });
}

async function getAuthHeaders(activeUser: FirebaseUser): Promise<Record<string, string>> {
    const idToken = await activeUser.getIdToken();
    return {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
    };
}

export function useUserSettings(options: UseUserSettingsOptions = {}) {
    const { expectedRole } = options;
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeUser, setActiveUser] = useState<FirebaseUser | null>(null);
    const [savingSection, setSavingSection] = useState<SettingsPatch['section'] | null>(null);

    const refresh = useCallback(async (userOverride?: FirebaseUser | null): Promise<UserSettings | null> => {
        const currentUser = userOverride ?? auth.currentUser;
        if (!currentUser) {
            setSettings(null);
            setError('Please sign in to manage your settings.');
            setLoading(false);
            return null;
        }

        setLoading(true);
        try {
            const headers = await getAuthHeaders(currentUser);
            const response = await fetch('/api/settings/me', {
                method: 'GET',
                headers,
                cache: 'no-store'
            });

            const payload = await response.json() as SettingsApiResponse;
            if (!response.ok || !payload.success || !payload.settings) {
                throw new Error(payload.error || 'Failed to load settings.');
            }

            if (expectedRole && payload.settings.role !== expectedRole) {
                throw new Error(`This settings page is limited to ${expectedRole} users.`);
            }

            setSettings(payload.settings);
            applyClientPreferences(payload.settings);
            setError(null);
            return payload.settings;
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : 'Failed to load settings.';
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [expectedRole]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setActiveUser(user);
            refresh(user).catch(() => null);
        });

        return () => unsubscribe();
    }, [refresh]);

    const updateSection = useCallback(async (patch: SettingsPatch): Promise<boolean> => {
        if (!activeUser) {
            setError('Please sign in to update your settings.');
            return false;
        }
        if (!settings) {
            setError('Settings are still loading. Try again in a moment.');
            return false;
        }

        const validation = settingsPatchSchema.safeParse(patch);
        if (!validation.success) {
            setError('Invalid settings payload.');
            return false;
        }

        const previousSettings = settings;
        const optimisticSettings = applyPatchOptimistically(previousSettings, validation.data);

        setSavingSection(validation.data.section);
        setSettings(optimisticSettings);
        applyClientPreferences(optimisticSettings);

        try {
            const headers = await getAuthHeaders(activeUser);
            const response = await fetch('/api/settings/me', {
                method: 'PATCH',
                headers,
                body: JSON.stringify(validation.data)
            });

            const payload = await response.json() as SettingsApiResponse;
            if (!response.ok || !payload.success || !payload.settings) {
                throw new Error(payload.error || 'Failed to save settings.');
            }

            if (expectedRole && payload.settings.role !== expectedRole) {
                throw new Error(`This settings page is limited to ${expectedRole} users.`);
            }

            setSettings(payload.settings);
            applyClientPreferences(payload.settings);
            setError(null);
            return true;
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'Failed to save settings.';
            setSettings(previousSettings);
            applyClientPreferences(previousSettings);
            setError(message);
            return false;
        } finally {
            setSavingSection(null);
        }
    }, [activeUser, expectedRole, settings]);

    return {
        settings,
        loading,
        error,
        savingSection,
        refresh,
        updateSection
    };
}
