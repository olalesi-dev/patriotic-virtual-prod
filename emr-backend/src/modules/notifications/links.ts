import { getEmrOrigin } from '../../config/app-origins';

export function buildPortalUrl(path: string): string {
    return new URL(path, getEmrOrigin()).toString();
}
