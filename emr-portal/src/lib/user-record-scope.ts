function normalizeRole(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}

export function shouldUsePatientsCollection(role: unknown): boolean {
    return normalizeRole(role) === 'patient';
}