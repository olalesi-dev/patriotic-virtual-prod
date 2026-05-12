import { Elysia } from 'elysia';
import { env } from '@workspace/env';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUTH_COOKIE_MARKERS = [
  'better-auth.session_token',
  'better-auth.session-token',
  '__Secure-better-auth.session_token',
  '__Host-better-auth.session_token',
];

export const parseTrustedOrigins = (...originLists: (string | undefined)[]) =>
  originLists
    .flatMap((value) => value?.split(',') ?? [])
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => Boolean(origin));

export const hasBetterAuthCookie = (cookieHeader: string | null) => {
  if (!cookieHeader) {
    return false;
  }

  return AUTH_COOKIE_MARKERS.some((marker) => cookieHeader.includes(marker));
};

export const hasBearerAuthorization = (authorizationHeader: string | null) =>
  Boolean(authorizationHeader?.match(/^Bearer\s+\S+/i));

export const getRequestOrigin = (headers: Headers) => {
  const origin = headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      return null;
    }
  }

  const referer = headers.get('referer');
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

export const isCsrfRequestAllowed = (
  request: Request,
  trustedOrigins: string[],
) => {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return true;
  }

  if (hasBearerAuthorization(request.headers.get('authorization'))) {
    return true;
  }

  if (!hasBetterAuthCookie(request.headers.get('cookie'))) {
    return true;
  }

  const requestOrigin = getRequestOrigin(request.headers);
  return Boolean(requestOrigin && trustedOrigins.includes(requestOrigin));
};

export const csrfProtection = new Elysia({ name: 'csrf.protection' }).onBeforeHandle(
  ({ request }) => {
    const trustedOrigins = parseTrustedOrigins(env.APP_URL, env.CORS_ORIGIN);
    if (isCsrfRequestAllowed(request, trustedOrigins)) {
      return;
    }

    return Response.json(
      {
        code: 403,
        error: 'CSRF validation failed',
        success: false,
      },
      { status: 403 },
    );
  },
);
