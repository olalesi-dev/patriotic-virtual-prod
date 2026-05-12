import { getBackendOrigin } from '@/lib/app-origins';

export function getApiOrigin(): string {
    return getBackendOrigin();
}

export function getApiUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${getApiOrigin()}${normalizedPath}`;
}
