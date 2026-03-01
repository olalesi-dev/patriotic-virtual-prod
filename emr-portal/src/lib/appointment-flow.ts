export type CanonicalAppointmentStatus =
    | 'waitlist'
    | 'pending'
    | 'confirmed'
    | 'checked_in'
    | 'completed'
    | 'cancelled'
    | 'no_show';

const STATUS_PROGRESS: Record<CanonicalAppointmentStatus, number> = {
    waitlist: 0,
    pending: 1,
    confirmed: 2,
    checked_in: 3,
    completed: 4,
    cancelled: 5,
    no_show: 5
};

const TERMINAL_STATUSES = new Set<CanonicalAppointmentStatus>(['completed', 'cancelled', 'no_show']);

function normalizeStatus(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function toCanonicalAppointmentStatus(value: unknown): CanonicalAppointmentStatus | null {
    const normalized = normalizeStatus(value);
    if (!normalized) return null;
    if (normalized === 'waitlist') return 'waitlist';
    if (normalized === 'pending') return 'pending';
    if (normalized === 'confirmed' || normalized === 'paid') return 'confirmed';
    if (normalized === 'checked_in') return 'checked_in';
    if (normalized === 'completed') return 'completed';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
    if (normalized === 'no_show') return 'no_show';
    if (normalized === 'scheduled' || normalized === 'upcoming') return 'pending';
    return null;
}

export function isAppointmentStatusTerminal(status: unknown): boolean {
    const canonical = toCanonicalAppointmentStatus(status);
    if (!canonical) return false;
    return TERMINAL_STATUSES.has(canonical);
}

export function canMoveAppointmentStatusForward(currentStatus: unknown, nextStatus: unknown): boolean {
    const current = toCanonicalAppointmentStatus(currentStatus);
    const next = toCanonicalAppointmentStatus(nextStatus);
    if (!current || !next) return false;
    if (current === next) return true;
    if (TERMINAL_STATUSES.has(current)) return false;
    if (next === 'cancelled' || next === 'no_show') {
        return true;
    }

    const currentProgress = STATUS_PROGRESS[current];
    const nextProgress = STATUS_PROGRESS[next];
    return nextProgress > currentProgress;
}

export function isVideoVisitType(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!normalized) return false;
    if (normalized.includes('in_person')) return false;
    return (
        normalized.includes('video') ||
        normalized.includes('telehealth') ||
        normalized.includes('virtual')
    );
}
