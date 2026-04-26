function pad(value: number): string {
    return value.toString().padStart(2, '0');
}

export function buildAppointmentDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00`);
}

export function formatDateForInput(value: string | Date | null | undefined): string {
    if (!value) return '';
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function formatTimeForInput(value: string | Date | null | undefined): string {
    if (!value) return '';
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function validateFutureAppointmentInput(date: string, time: string, now = new Date()): string | null {
    if (!date || !time) {
        return 'Date and time are required.';
    }

    const parsed = buildAppointmentDateTime(date, time);
    if (Number.isNaN(parsed.getTime())) {
        return 'Invalid appointment date or time.';
    }

    if (parsed.getTime() < now.getTime()) {
        return 'Appointments cannot be moved to a past date or time.';
    }

    return null;
}

