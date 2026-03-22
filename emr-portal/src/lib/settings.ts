import { z } from 'zod';

export const SETTINGS_VERSION = 1;

export const SETTINGS_ROLES = ['provider', 'patient'] as const;
export type SettingsRole = typeof SETTINGS_ROLES[number];

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = typeof THEME_MODES[number];

export const WEEK_START_OPTIONS = ['sunday', 'monday'] as const;
export type WeekStart = typeof WEEK_START_OPTIONS[number];

export const LANGUAGE_OPTIONS = ['en-US', 'en-GB', 'es-ES'] as const;

const COMMON_TIMEZONE_CANDIDATES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'America/Toronto',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Asia/Kolkata',
    'Asia/Kathmandu',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney'
] as const;

export const COMMON_TIMEZONES = COMMON_TIMEZONE_CANDIDATES.filter((zone) => isValidTimeZone(zone));

export const VISIT_TYPE_OPTIONS = ['all', 'telehealth', 'in_person'] as const;
export type AvailabilityVisitType = typeof VISIT_TYPE_OPTIONS[number];

export const CONNECTED_APP_KEYS = [
    'gmail',
    'googleCalendar',
    'outlook',
    'microsoftCalendar',
    'zoom'
] as const;
export type ConnectedAppKey = typeof CONNECTED_APP_KEYS[number];

export const WEEKDAY_KEYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
] as const;
export type WeekdayKey = typeof WEEKDAY_KEYS[number];

export const DAY_LABELS: Record<WeekdayKey, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
};

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const BASE_THEME_COLORS = ['#4F46E5', '#0EA5E9', '#6366F1', '#059669', '#9333EA'] as const;
export const THEME_COLOR_OPTIONS = [...BASE_THEME_COLORS];

export function isValidTimeZone(value: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

export function normalizeTimeZone(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed && isValidTimeZone(trimmed) ? trimmed : fallback;
}

export function getBrowserTimeZone(): string {
    if (typeof Intl === 'undefined') return 'UTC';
    try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return zone && isValidTimeZone(zone) ? zone : 'UTC';
    } catch {
        return 'UTC';
    }
}

export function toHourMinuteLabel(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: normalizeTimeZone(timezone, 'UTC')
    }).format(date);
}

export function toDateTimeLabel(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: normalizeTimeZone(timezone, 'UTC')
    }).format(date);
}

export const settingsProfileSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(60),
    lastName: z.string().trim().min(1, 'Last name is required').max(60),
    email: z.string().trim().email().or(z.literal('')),
    phone: z.string().trim().max(32),
    title: z.string().trim().max(80),
    specialty: z.string().trim().max(120)
});

export const settingsLocaleSchema = z.object({
    language: z.enum(LANGUAGE_OPTIONS),
    timezone: z.string().trim().min(1).refine((value) => isValidTimeZone(value), 'Invalid timezone'),
    weekStart: z.enum(WEEK_START_OPTIONS)
});

export const settingsThemeSchema = z.object({
    mode: z.enum(THEME_MODES),
    accentColor: z.string().trim().regex(HEX_COLOR_REGEX)
});

const notificationPreferenceSchema = z.object({
    inApp: z.boolean(),
    email: z.boolean()
});

export const settingsNotificationsSchema = z.object({
    scheduling: notificationPreferenceSchema,
    practitionerScheduling: notificationPreferenceSchema,
    billing: notificationPreferenceSchema,
    clientDocumentation: notificationPreferenceSchema,
    workspace: notificationPreferenceSchema,
    communications: notificationPreferenceSchema
});

const connectedAppStateSchema = z.object({
    connected: z.boolean(),
    accountLabel: z.string().trim().max(80).nullable(),
    connectedAt: z.string().datetime().nullable()
});

export const settingsConnectedAppsSchema = z.object({
    gmail: connectedAppStateSchema,
    googleCalendar: connectedAppStateSchema,
    outlook: connectedAppStateSchema,
    microsoftCalendar: connectedAppStateSchema,
    zoom: connectedAppStateSchema
});

const providerServiceSchema = z.object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1).max(120),
    enabled: z.boolean(),
    durationMinutes: z.number().int().min(10).max(240),
    priceUsd: z.number().min(0).max(5000)
});

export const providerServicesSchema = z.array(providerServiceSchema).min(1).max(20);

const availabilityDaySchema = z.object({
    enabled: z.boolean(),
    start: z.string().regex(TIME_REGEX),
    end: z.string().regex(TIME_REGEX),
    visitType: z.enum(VISIT_TYPE_OPTIONS)
}).superRefine((value, ctx) => {
    if (!value.enabled) return;
    if (value.start >= value.end) {
        ctx.addIssue({
            code: 'custom',
            message: 'End time must be after start time.',
            path: ['end']
        });
    }
});

export const providerAvailabilitySchema = z.object({
    timezone: z.string().trim().min(1).refine((value) => isValidTimeZone(value), 'Invalid timezone'),
    weekly: z.object({
        monday: availabilityDaySchema,
        tuesday: availabilityDaySchema,
        wednesday: availabilityDaySchema,
        thursday: availabilityDaySchema,
        friday: availabilityDaySchema,
        saturday: availabilityDaySchema,
        sunday: availabilityDaySchema
    }),
    dateOverrides: z.array(z.object({
        id: z.string().trim().min(1),
        date: z.string().regex(ISO_DATE_REGEX),
        unavailable: z.boolean(),
        start: z.string().regex(TIME_REGEX),
        end: z.string().regex(TIME_REGEX),
        note: z.string().trim().max(200)
    }).superRefine((value, ctx) => {
        if (value.unavailable) return;
        if (value.start >= value.end) {
            ctx.addIssue({
                code: 'custom',
                message: 'End time must be after start time.',
                path: ['end']
            });
        }
    })).max(90)
});

export const providerSettingsSchema = z.object({
    version: z.literal(SETTINGS_VERSION),
    role: z.literal('provider'),
    profile: settingsProfileSchema,
    locale: settingsLocaleSchema,
    theme: settingsThemeSchema,
    notifications: settingsNotificationsSchema,
    connectedApps: settingsConnectedAppsSchema,
    services: providerServicesSchema,
    availability: providerAvailabilitySchema
});

export const patientSettingsSchema = z.object({
    version: z.literal(SETTINGS_VERSION),
    role: z.literal('patient'),
    profile: settingsProfileSchema,
    locale: settingsLocaleSchema,
    theme: settingsThemeSchema,
    notifications: settingsNotificationsSchema,
    connectedApps: settingsConnectedAppsSchema
});

export const userSettingsSchema = z.union([providerSettingsSchema, patientSettingsSchema]);

export type ProviderSettings = z.infer<typeof providerSettingsSchema>;
export type PatientSettings = z.infer<typeof patientSettingsSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const settingsPatchSchema = z.discriminatedUnion('section', [
    z.object({
        section: z.literal('profile'),
        value: settingsProfileSchema
    }),
    z.object({
        section: z.literal('locale'),
        value: settingsLocaleSchema
    }),
    z.object({
        section: z.literal('theme'),
        value: settingsThemeSchema
    }),
    z.object({
        section: z.literal('notifications'),
        value: settingsNotificationsSchema
    }),
    z.object({
        section: z.literal('connectedApps'),
        value: settingsConnectedAppsSchema
    }),
    z.object({
        section: z.literal('services'),
        value: providerServicesSchema
    }),
    z.object({
        section: z.literal('availability'),
        value: providerAvailabilitySchema
    })
]);

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

function splitDisplayName(displayName: string | null | undefined): { firstName: string; lastName: string } {
    const normalized = (displayName ?? '').trim();
    if (!normalized) {
        return { firstName: 'Care', lastName: 'User' };
    }

    const parts = normalized.split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: 'User' };
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
    };
}

function buildDefaultNotifications() {
    return settingsNotificationsSchema.parse({
        scheduling: { inApp: true, email: false },
        practitionerScheduling: { inApp: false, email: true },
        billing: { inApp: true, email: true },
        clientDocumentation: { inApp: true, email: false },
        workspace: { inApp: true, email: false },
        communications: { inApp: true, email: true }
    });
}

function buildDefaultConnectedApps() {
    return settingsConnectedAppsSchema.parse({
        gmail: { connected: false, accountLabel: null, connectedAt: null },
        googleCalendar: { connected: false, accountLabel: null, connectedAt: null },
        outlook: { connected: false, accountLabel: null, connectedAt: null },
        microsoftCalendar: { connected: false, accountLabel: null, connectedAt: null },
        zoom: { connected: false, accountLabel: null, connectedAt: null }
    });
}

function buildDefaultProviderServices() {
    return providerServicesSchema.parse([
        { id: 'telehealth_followup', name: 'Telehealth Follow-up', enabled: true, durationMinutes: 30, priceUsd: 85 },
        { id: 'initial_consult', name: 'Initial Consultation', enabled: true, durationMinutes: 60, priceUsd: 165 },
        { id: 'lab_review', name: 'Lab Results Review', enabled: true, durationMinutes: 20, priceUsd: 65 },
        { id: 'care_coordination', name: 'Care Coordination', enabled: false, durationMinutes: 25, priceUsd: 55 }
    ]);
}

function buildDefaultProviderAvailability(timezone: string) {
    return providerAvailabilitySchema.parse({
        timezone,
        weekly: {
            monday: { enabled: true, start: '09:00', end: '17:00', visitType: 'all' },
            tuesday: { enabled: true, start: '09:00', end: '17:00', visitType: 'all' },
            wednesday: { enabled: true, start: '09:00', end: '17:00', visitType: 'all' },
            thursday: { enabled: true, start: '09:00', end: '17:00', visitType: 'all' },
            friday: { enabled: true, start: '09:00', end: '16:00', visitType: 'all' },
            saturday: { enabled: false, start: '09:00', end: '12:00', visitType: 'telehealth' },
            sunday: { enabled: false, start: '09:00', end: '12:00', visitType: 'telehealth' }
        },
        dateOverrides: []
    });
}

export function buildDefaultSettings(input: {
    role: SettingsRole;
    email: string | null;
    displayName?: string | null;
    phone?: string | null;
    specialty?: string | null;
    timezone?: string | null;
}): UserSettings {
    const timezone = normalizeTimeZone(input.timezone, getBrowserTimeZone());
    const { firstName, lastName } = splitDisplayName(input.displayName);

    const common = {
        version: SETTINGS_VERSION,
        profile: {
            firstName,
            lastName,
            email: input.email ?? '',
            phone: input.phone ?? '',
            title: input.role === 'provider' ? 'Provider' : 'Patient',
            specialty: input.role === 'provider' ? (input.specialty ?? 'Primary Care') : ''
        },
        locale: {
            language: 'en-US' as const,
            timezone,
            weekStart: 'monday' as const
        },
        theme: {
            mode: 'system' as const,
            accentColor: '#4F46E5'
        },
        notifications: buildDefaultNotifications(),
        connectedApps: buildDefaultConnectedApps()
    };

    if (input.role === 'provider') {
        return providerSettingsSchema.parse({
            ...common,
            role: 'provider',
            services: buildDefaultProviderServices(),
            availability: buildDefaultProviderAvailability(timezone)
        });
    }

    return patientSettingsSchema.parse({
        ...common,
        role: 'patient'
    });
}

export function normalizeSettings(
    rawSettings: unknown,
    defaults: UserSettings
): UserSettings {
    const asObject = (typeof rawSettings === 'object' && rawSettings !== null)
        ? rawSettings as Record<string, unknown>
        : {};

    if (defaults.role === 'provider') {
        return providerSettingsSchema.parse({
            version: SETTINGS_VERSION,
            role: 'provider',
            profile: settingsProfileSchema.safeParse(asObject.profile).success
                ? (asObject.profile as ProviderSettings['profile'])
                : defaults.profile,
            locale: settingsLocaleSchema.safeParse(asObject.locale).success
                ? (asObject.locale as ProviderSettings['locale'])
                : defaults.locale,
            theme: settingsThemeSchema.safeParse(asObject.theme).success
                ? (asObject.theme as ProviderSettings['theme'])
                : defaults.theme,
            notifications: settingsNotificationsSchema.safeParse(asObject.notifications).success
                ? (asObject.notifications as ProviderSettings['notifications'])
                : defaults.notifications,
            connectedApps: settingsConnectedAppsSchema.safeParse(asObject.connectedApps).success
                ? (asObject.connectedApps as ProviderSettings['connectedApps'])
                : defaults.connectedApps,
            services: providerServicesSchema.safeParse(asObject.services).success
                ? (asObject.services as ProviderSettings['services'])
                : defaults.services,
            availability: providerAvailabilitySchema.safeParse(asObject.availability).success
                ? (asObject.availability as ProviderSettings['availability'])
                : defaults.availability
        });
    }

    return patientSettingsSchema.parse({
        version: SETTINGS_VERSION,
        role: 'patient',
        profile: settingsProfileSchema.safeParse(asObject.profile).success
            ? (asObject.profile as PatientSettings['profile'])
            : defaults.profile,
        locale: settingsLocaleSchema.safeParse(asObject.locale).success
            ? (asObject.locale as PatientSettings['locale'])
            : defaults.locale,
        theme: settingsThemeSchema.safeParse(asObject.theme).success
            ? (asObject.theme as PatientSettings['theme'])
            : defaults.theme,
        notifications: settingsNotificationsSchema.safeParse(asObject.notifications).success
            ? (asObject.notifications as PatientSettings['notifications'])
            : defaults.notifications,
        connectedApps: settingsConnectedAppsSchema.safeParse(asObject.connectedApps).success
            ? (asObject.connectedApps as PatientSettings['connectedApps'])
            : defaults.connectedApps
    });
}
