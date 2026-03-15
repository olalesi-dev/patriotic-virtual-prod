import type { User as FirebaseUser } from 'firebase/auth';

interface ApiFetchJsonOptions extends Omit<RequestInit, 'body' | 'headers'> {
    user?: FirebaseUser | null;
    headers?: HeadersInit;
    body?: BodyInit | object | null;
}

interface ApiErrorPayload {
    error?: string;
    message?: string;
}

function isJsonBody(body: unknown): body is Record<string, unknown> | unknown[] {
    if (!body || typeof body !== 'object') return false;
    if (body instanceof FormData) return false;
    if (body instanceof URLSearchParams) return false;
    if (body instanceof Blob) return false;
    if (body instanceof ArrayBuffer) return false;
    return true;
}

async function buildHeaders(user?: FirebaseUser | null, headers?: HeadersInit, hasJsonBody?: boolean) {
    const nextHeaders = new Headers(headers);

    if (user) {
        const idToken = await user.getIdToken();
        nextHeaders.set('Authorization', `Bearer ${idToken}`);
    }

    if (hasJsonBody && !nextHeaders.has('Content-Type')) {
        nextHeaders.set('Content-Type', 'application/json');
    }

    return nextHeaders;
}

async function readErrorMessage(response: Response): Promise<string> {
    try {
        const payload = await response.clone().json() as ApiErrorPayload;
        return payload.error ?? payload.message ?? `Request failed with status ${response.status}.`;
    } catch {
        return `Request failed with status ${response.status}.`;
    }
}

export async function apiFetchJson<T>(input: RequestInfo | URL, options: ApiFetchJsonOptions = {}): Promise<T> {
    const { user, headers, body, ...init } = options;
    const jsonBody = isJsonBody(body);
    const resolvedHeaders = await buildHeaders(user, headers, jsonBody);
    const resolvedBody: BodyInit | undefined = jsonBody
        ? JSON.stringify(body)
        : (body as BodyInit | null | undefined) ?? undefined;

    const response = await fetch(input, {
        ...init,
        headers: resolvedHeaders,
        body: resolvedBody
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}
