"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User as FirebaseUser } from 'firebase/auth';
import { useCallback, useMemo, useState } from 'react';
import {
    normalizeSettings,
    type SettingsPatch,
    type SettingsRole,
    settingsPatchSchema,
    type UserSettings
} from '@/lib/settings';
import { useAuthUser } from '@/hooks/useAuthUser';
import { apiFetchJson } from '@/lib/api-client';
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

export function useUserSettings(options: UseUserSettingsOptions = {}) {
    const { expectedRole } = options;
    const queryClient = useQueryClient();
    const { user: activeUser, isReady } = useAuthUser();
    const [savingSection, setSavingSection] = useState<SettingsPatch['section'] | null>(null);

    const queryKey = useMemo(
        () => ['settings', activeUser?.uid ?? 'anonymous', expectedRole ?? 'any'] as const,
        [activeUser?.uid, expectedRole]
    );

    const fetchSettings = useCallback(async (user: FirebaseUser) => {
        const payload = await apiFetchJson<SettingsApiResponse>('/api/settings/me', {
            method: 'GET',
            user,
            cache: 'no-store'
        });

        if (!payload.success || !payload.settings) {
            throw new Error(payload.error || 'Failed to load settings.');
        }

        if (expectedRole && payload.settings.role !== expectedRole) {
            throw new Error(`This settings page is limited to ${expectedRole} users.`);
        }

        return payload.settings;
    }, [expectedRole]);

    const settingsQuery = useQuery({
        queryKey,
        enabled: isReady && Boolean(activeUser),
        queryFn: () => fetchSettings(activeUser as FirebaseUser)
    });

    const updateMutation = useMutation({
        mutationFn: async (patch: SettingsPatch) => {
            if (!activeUser) {
                throw new Error('Please sign in to update your settings.');
            }

            const validation = settingsPatchSchema.safeParse(patch);
            if (!validation.success) {
                throw new Error('Invalid settings payload.');
            }

            const payload = await apiFetchJson<SettingsApiResponse>('/api/settings/me', {
                method: 'PATCH',
                user: activeUser,
                body: validation.data
            });

            if (!payload.success || !payload.settings) {
                throw new Error(payload.error || 'Failed to save settings.');
            }

            if (expectedRole && payload.settings.role !== expectedRole) {
                throw new Error(`This settings page is limited to ${expectedRole} users.`);
            }

            return payload.settings;
        },
        onMutate: async (patch) => {
            const validation = settingsPatchSchema.safeParse(patch);
            if (!validation.success) {
                throw new Error('Invalid settings payload.');
            }

            setSavingSection(validation.data.section);
            await queryClient.cancelQueries({ queryKey });

            const previousSettings = queryClient.getQueryData<UserSettings>(queryKey);
            if (previousSettings) {
                const optimisticSettings = applyPatchOptimistically(previousSettings, validation.data);
                queryClient.setQueryData(queryKey, optimisticSettings);
                applyClientPreferences(optimisticSettings);
            }

            return { previousSettings };
        },
        onSuccess: (nextSettings) => {
            queryClient.setQueryData(queryKey, nextSettings);
            applyClientPreferences(nextSettings);
        },
        onError: (_error, _patch, context) => {
            if (context?.previousSettings) {
                queryClient.setQueryData(queryKey, context.previousSettings);
                applyClientPreferences(context.previousSettings);
            }
        },
        onSettled: () => {
            setSavingSection(null);
        }
    });

    const refresh = useCallback(async (userOverride?: FirebaseUser | null): Promise<UserSettings | null> => {
        const currentUser = userOverride ?? activeUser;
        if (!currentUser) {
            return null;
        }

        const nextQueryKey = ['settings', currentUser.uid, expectedRole ?? 'any'] as const;
        const nextSettings = await queryClient.fetchQuery({
            queryKey: nextQueryKey,
            queryFn: () => fetchSettings(currentUser)
        });
        applyClientPreferences(nextSettings);
        return nextSettings;
    }, [activeUser, expectedRole, fetchSettings, queryClient]);

    const updateSection = useCallback(async (patch: SettingsPatch): Promise<boolean> => {
        try {
            await updateMutation.mutateAsync(patch);
            return true;
        } catch {
            return false;
        }
    }, [updateMutation]);

    const settings = settingsQuery.data ?? null;
    const loading = !isReady || settingsQuery.isLoading;
    const error = activeUser
        ? (settingsQuery.error instanceof Error
            ? settingsQuery.error.message
            : updateMutation.error instanceof Error
                ? updateMutation.error.message
                : null)
        : (isReady ? 'Please sign in to manage your settings.' : null);

    return {
        settings,
        loading,
        error,
        savingSection,
        refresh,
        updateSection
    };
}
