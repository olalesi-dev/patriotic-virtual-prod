const DEFAULT_LOCAL_EMR_ORIGIN = 'http://localhost:3001';
const DEFAULT_LOCAL_MARKETING_ORIGIN = 'http://localhost:3000';
const DEFAULT_LOCAL_BACKEND_ORIGIN = 'http://localhost:8080';
const DEFAULT_PACS_ORIGIN = 'https://pacs.patriotictelehealth.com';

function normalizeOrigin(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
        return new URL(trimmed).toString().replace(/\/$/, '');
    } catch {
        return null;
    }
}

function joinUrl(origin: string, path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${origin}${normalizedPath}`;
}

export function getEmrAppOrigin(): string {
    return (
        normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
        normalizeOrigin(process.env.NEXT_PUBLIC_BASE_URL) ??
        DEFAULT_LOCAL_EMR_ORIGIN
    );
}

export function getMarketingOrigin(): string {
    return (
        normalizeOrigin(process.env.NEXT_PUBLIC_MARKETING_URL) ??
        DEFAULT_LOCAL_MARKETING_ORIGIN
    );
}

export function getBackendOrigin(): string {
    return (
        normalizeOrigin(process.env.NEXT_PUBLIC_API_URL) ??
        DEFAULT_LOCAL_BACKEND_ORIGIN
    );
}

export function getPacsOrigin(): string {
    return (
        normalizeOrigin(process.env.NEXT_PUBLIC_PACS_URL) ??
        DEFAULT_PACS_ORIGIN
    );
}

export function getBackendUrl(path: string): string {
    return joinUrl(getBackendOrigin(), path);
}

export function getMarketingUrl(path: string): string {
    return joinUrl(getMarketingOrigin(), path);
}

export function getPacsViewerUrl(studyUid?: string | null): string {
    if (!studyUid) {
        return `${getPacsOrigin()}/`;
    }

    return joinUrl(getPacsOrigin(), `/viewer?StudyInstanceUID=${encodeURIComponent(studyUid)}`);
}
