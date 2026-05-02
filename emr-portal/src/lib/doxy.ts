export const DOXY_IFRAME_ALLOW = [
    'camera *',
    'microphone *',
    'fullscreen *',
    'display-capture *',
].join('; ');

export const DOXY_BASE_URL = 'https://pvt.doxy.me';
export const DEFAULT_DOXY_ROOM = 'virtualtelehealth';
export const DR_O_DOXY_ROOM = 'dro';

const DR_O_EMAIL = 'dr.o@patriotictelehealth.com';

interface ProviderDoxyInput {
    email?: string | null;
    roomName?: string | null;
    doxyRoom?: string | null;
}

function normalizeRoom(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
    return trimmed || null;
}

export function buildDoxyRoomUrl(room: string): string {
    return `${DOXY_BASE_URL}/${encodeURIComponent(room)}`;
}

export function resolveProviderDoxyRoom(provider: ProviderDoxyInput | null | undefined): string {
    const configuredRoom = normalizeRoom(provider?.doxyRoom) ?? normalizeRoom(provider?.roomName);
    if ((provider?.email ?? '').trim().toLowerCase() === DR_O_EMAIL || configuredRoom?.toLowerCase() === DR_O_DOXY_ROOM) {
        return DR_O_DOXY_ROOM;
    }

    return DEFAULT_DOXY_ROOM;
}

export function buildPatientDoxyJoinUrl(input: {
    meetingUrl: string;
    patientName?: string | null;
    patientId?: string | null;
}): string {
    try {
        const url = new URL(input.meetingUrl);
        if (!url.hostname.toLowerCase().endsWith('doxy.me')) {
            return input.meetingUrl;
        }
        const patientName = input.patientName?.trim();
        if (patientName) {
            url.searchParams.set('username', patientName);
        }
        url.searchParams.set('autocheckin', 'true');
        if (input.patientId?.trim()) {
            url.searchParams.set('pid', input.patientId.trim());
        }
        return url.toString();
    } catch {
        return input.meetingUrl;
    }
}

export function normalizeDoxyMeetingUrl(value: string | null | undefined): string {
    const fallback = buildDoxyRoomUrl(DEFAULT_DOXY_ROOM);
    const url = value?.trim() || fallback;
    const lowerUrl = url.toLowerCase();
    const isStale =
        lowerUrl.includes('check-in') ||
        lowerUrl.includes('doxy.me/patriotic-visit-') ||
        lowerUrl.includes('doxy.me/patrioticvirtualtelehealth') ||
        lowerUrl === 'https://doxy.me/patrioticvirtualtelehealth' ||
        (lowerUrl.includes('doxy.me') && !lowerUrl.startsWith(`${DOXY_BASE_URL}/`));

    return isStale ? fallback : url;
}

export function resolveProviderDoxyLink(provider: ProviderDoxyInput | null | undefined): {
    room: string;
    url: string;
} {
    const room = resolveProviderDoxyRoom(provider);
    return { room, url: buildDoxyRoomUrl(room) };
}
