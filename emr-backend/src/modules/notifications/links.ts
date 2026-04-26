const DEFAULT_FRONTEND_URL = 'https://patriotictelehealth.com';

function normalizeOrigin(value: string | undefined | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
        return new URL(trimmed).origin;
    } catch {
        return null;
    }
}

export function buildPortalUrl(path: string): string {
    const baseUrl = normalizeOrigin(process.env.FRONTEND_URL)
        ?? normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
        ?? DEFAULT_FRONTEND_URL;

    return new URL(path, baseUrl).toString();
}
