export const DOXY_IFRAME_ALLOW = [
  'camera *',
  'microphone *',
  'fullscreen *',
  'display-capture *',
].join('; ');

export const DOXY_BASE_URL = 'https://pvt.doxy.me';
export const DEFAULT_DOXY_ROOM = 'virtualtelehealth';
export const DR_O_DOXY_ROOM = 'dro';

const drOEmail = 'dr.o@patriotictelehealth.com';
const joinWindowMinutes = 60;

interface ProviderDoxyInput {
  email?: string | null;
  roomName?: string | null;
  doxyRoom?: string | null;
}

const normalizeRoom = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
  return trimmed || undefined;
};

export const buildDoxyRoomUrl = (room: string): string =>
  `${DOXY_BASE_URL}/${encodeURIComponent(room)}`;

export const resolveProviderDoxyRoom = (
  provider: ProviderDoxyInput | null | undefined,
): string => {
  const configuredRoom =
    normalizeRoom(provider?.doxyRoom) ?? normalizeRoom(provider?.roomName);
  const email = provider?.email?.trim().toLowerCase();

  if (email === drOEmail || configuredRoom?.toLowerCase() === DR_O_DOXY_ROOM) {
    return DR_O_DOXY_ROOM;
  }

  return configuredRoom ?? DEFAULT_DOXY_ROOM;
};

export const buildPatientDoxyJoinUrl = (input: {
  meetingUrl: string;
  patientName?: string | null;
  patientId?: string | null;
}): string => {
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
};

export const normalizeDoxyMeetingUrl = (
  value: string | null | undefined,
): string => {
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
};

export const resolveProviderDoxyLink = (
  provider: ProviderDoxyInput | null | undefined,
): {
  room: string;
  url: string;
} => {
  const room = resolveProviderDoxyRoom(provider);
  return { room, url: buildDoxyRoomUrl(room) };
};

export const toJoinDate = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
};

export const isTelehealthJoinAvailable = (value: unknown): boolean => {
  const appointmentDate = toJoinDate(value);
  if (!appointmentDate) {
    return false;
  }

  const now = Date.now();
  const windowMs = joinWindowMinutes * 60 * 1000;
  const appointmentTime = appointmentDate.getTime();

  return now >= appointmentTime - windowMs && now <= appointmentTime + windowMs;
};
