const TEAM_COLOR_PALETTE = [
    '#4F46E5',
    '#7C3AED',
    '#0EA5E9',
    '#14B8A6',
    '#22C55E',
    '#F59E0B',
    '#EF4444',
    '#EC4899',
    '#8B5CF6',
    '#3B82F6'
] as const;

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHexColor(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (normalized.length === 4) {
        const r = normalized.charAt(1);
        const g = normalized.charAt(2);
        const b = normalized.charAt(3);
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return normalized;
}

export function normalizeTeamColor(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!HEX_COLOR_REGEX.test(normalized)) return null;
    return normalizeHexColor(normalized);
}

export function getRandomTeamColor(): string {
    const randomIndex = Math.floor(Math.random() * TEAM_COLOR_PALETTE.length);
    return TEAM_COLOR_PALETTE[randomIndex];
}

export function getDeterministicTeamColor(seed: string): string {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(index);
        hash |= 0;
    }

    const normalizedIndex = Math.abs(hash) % TEAM_COLOR_PALETTE.length;
    return TEAM_COLOR_PALETTE[normalizedIndex];
}

export function getTeamColorPalette(): readonly string[] {
    return TEAM_COLOR_PALETTE;
}
