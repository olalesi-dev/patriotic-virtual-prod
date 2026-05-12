export const DEFAULT_EMR_ORIGIN = 'https://emr.patriotictelehealth.com';
export const DEFAULT_MARKETING_ORIGIN = 'https://patriotictelehealth.com';
export const DEFAULT_BACKEND_PUBLIC_ORIGIN = 'https://api.patriotictelehealth.com';

export function normalizeOrigin(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
        return new URL(trimmed).origin;
    } catch {
        return null;
    }
}

export function normalizeAbsoluteUrl(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
        return new URL(trimmed).toString().replace(/\/$/, '');
    } catch {
        return null;
    }
}

export function getEmrOrigin(): string {
    return (
        normalizeAbsoluteUrl(process.env.FRONTEND_URL) ??
        normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL) ??
        DEFAULT_EMR_ORIGIN
    );
}

export function getMarketingOrigin(): string {
    return (
        normalizeAbsoluteUrl(process.env.MARKETING_URL) ??
        DEFAULT_MARKETING_ORIGIN
    );
}

export function getBackendPublicOrigin(): string {
    return (
        normalizeAbsoluteUrl(process.env.BACKEND_PUBLIC_URL) ??
        DEFAULT_BACKEND_PUBLIC_ORIGIN
    );
}
