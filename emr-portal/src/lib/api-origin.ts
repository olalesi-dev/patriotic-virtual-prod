const DEFAULT_BACKEND_ORIGIN = 'http://localhost:8080';

function normalizeOrigin(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
        return new URL(trimmed).toString().replace(/\/$/, '');
    } catch {
        return null;
    }
}

export function getApiOrigin(): string {
    return normalizeOrigin(process.env.NEXT_PUBLIC_API_URL) ?? DEFAULT_BACKEND_ORIGIN;
}

export function getApiUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${getApiOrigin()}${normalizedPath}`;
}
