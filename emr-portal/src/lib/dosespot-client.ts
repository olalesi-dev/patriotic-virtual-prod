import { getApiOrigin } from '@/lib/api-origin';

const DEFAULT_DOSESPOT_ORIGIN = 'http://localhost:8080';

function normalizeOrigin(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
        return new URL(trimmed).toString().replace(/\/$/, '');
    } catch {
        return null;
    }
}

function getDoseSpotApiOrigin(): string {
    return (
        normalizeOrigin(process.env.NEXT_PUBLIC_DOSESPOT_BACKEND_URL) ??
        getApiOrigin() ??
        DEFAULT_DOSESPOT_ORIGIN
    );
}

export function getDoseSpotApiUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${getDoseSpotApiOrigin()}${normalizedPath}`;
}
