import { addMinutes, isAfter, isBefore, subMinutes } from 'date-fns';

export function toJoinDate(value: unknown): Date | null {
    if (!value) return null;
    if (typeof (value as { toDate?: unknown }).toDate === 'function') {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

export function isTelehealthJoinAvailable(value: unknown): boolean {
    const appointmentDate = toJoinDate(value);
    if (!appointmentDate) return false;

    const now = new Date();
    return isAfter(now, subMinutes(appointmentDate, 60)) && isBefore(now, addMinutes(appointmentDate, 60));
}
