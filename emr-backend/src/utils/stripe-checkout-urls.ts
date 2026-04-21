const DEFAULT_APP_URL = 'https://patriotic-virtual-emr.web.app';
const STRIPE_CHECKOUT_SESSION_TOKEN = '{CHECKOUT_SESSION_ID}';

export function normalizeAbsoluteUrl(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
        return new URL(trimmed).toString().replace(/\/$/, '');
    } catch {
        return null;
    }
}

function restoreStripeSessionToken(url: string): string {
    return url.replace(
        encodeURIComponent(STRIPE_CHECKOUT_SESSION_TOKEN),
        STRIPE_CHECKOUT_SESSION_TOKEN,
    );
}

export function buildCheckoutRedirectUrl(options: {
    baseUrl: string;
    targetUrl?: string | null;
    consultationId?: string | null;
    sessionId: string;
    paymentStatus: 'success' | 'cancelled';
}): string {
    const { baseUrl, targetUrl, consultationId, sessionId, paymentStatus } = options;
    const normalizedBaseUrl = normalizeAbsoluteUrl(baseUrl) ?? DEFAULT_APP_URL;
    const normalizedTargetUrl = targetUrl?.trim();

    let redirectUrl: URL;
    if (normalizedTargetUrl) {
        try {
            redirectUrl = new URL(normalizedTargetUrl, normalizedBaseUrl);
        } catch {
            redirectUrl = new URL(normalizedBaseUrl);
        }
    } else {
        redirectUrl = new URL(normalizedBaseUrl);
    }

    redirectUrl.searchParams.set('payment', paymentStatus);

    if (paymentStatus === 'success') {
        redirectUrl.searchParams.set('session_id', sessionId);
        if (consultationId) {
            redirectUrl.searchParams.set('consultationId', consultationId);
        }
    } else {
        redirectUrl.searchParams.delete('session_id');
    }

    return restoreStripeSessionToken(redirectUrl.toString());
}
