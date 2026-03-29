import { getDoseSpotAccessToken } from '../utils/dosespot';

export interface DoseSpotResult {
    ResultCode?: string;
    ResultDescription?: string;
}

export interface DoseSpotApiFetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    onBehalfOfClinicianId?: number;
}

function normalizeConfigValue(value: string | undefined, name: string): string {
    const normalized = value?.trim();
    if (!normalized) {
        throw new Error(`Missing ${name} for DoseSpot REST API calls.`);
    }
    return normalized;
}

export async function doseSpotApiFetch<T>(
    path: string,
    options: DoseSpotApiFetchOptions = {}
): Promise<T> {
    const baseUrl = normalizeConfigValue(process.env.DOSESPOT_BASE_URL, 'DOSESPOT_BASE_URL');
    const subscriptionKey = normalizeConfigValue(process.env.DOSESPOT_SUBSCRIPTION_KEY, 'DOSESPOT_SUBSCRIPTION_KEY');
    const accessToken = await getDoseSpotAccessToken(options.onBehalfOfClinicianId);
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/+/, '');

    const response = await fetch(`${normalizedBaseUrl}/webapi/v2/${normalizedPath}`, {
        method: options.method ?? 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Subscription-Key': subscriptionKey,
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
        const responseText = await response.text();
        const extra = responseText.trim() ? ` - ${responseText.trim().slice(0, 240)}` : '';
        throw new Error(`DoseSpot API ${options.method ?? 'GET'} ${normalizedPath} failed: ${response.status} ${response.statusText}${extra}`);
    }

    return response.json() as Promise<T>;
}

export function ensureDoseSpotResultOk(result: DoseSpotResult | undefined, operation: string): void {
    if (!result) return;
    if ((result.ResultCode ?? '').toUpperCase() !== 'ERROR') return;
    throw new Error(
        result.ResultDescription
            ? `DoseSpot ${operation} failed: ${result.ResultDescription}`
            : `DoseSpot ${operation} failed.`
    );
}
