const PLATFORM_NAME = 'Patriotic Telehealth';

export function getPlatformName(): string {
    return PLATFORM_NAME;
}

export function formatAppointmentDate(value: Date | string | null | undefined): string {
    const date = toDate(value);
    if (!date) return 'TBD';

    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

export function formatAppointmentTime(value: Date | string | null | undefined): string {
    const date = toDate(value);
    if (!date) return 'TBD';

    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date);
}

export function formatRequestedDate(value: Date | string | null | undefined): string {
    const date = toDate(value);
    if (!date) return 'as soon as possible';

    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date);
}

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
