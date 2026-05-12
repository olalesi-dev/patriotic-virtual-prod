import { Elysia } from 'elysia';
import { env } from '@workspace/env';

export interface TransportSecurityConfig {
  nodeEnv: string | undefined;
  requireHttps: boolean;
  hstsMaxAgeSeconds: number;
  hstsIncludeSubDomains: boolean;
  hstsPreload: boolean;
  noStoreApiResponses: boolean;
}

const defaultHstsMaxAgeSeconds = 31_536_000;

export const parseBooleanSetting = (
  value: string | undefined,
  defaultValue: boolean,
) => {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export const parsePositiveIntegerSetting = (
  value: string | undefined,
  defaultValue: number,
) => {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

export const buildTransportSecurityConfig = (): TransportSecurityConfig => ({
  nodeEnv: env.NODE_ENV,
  requireHttps:
    env.NODE_ENV === 'production' &&
    parseBooleanSetting(env.SECURITY_REQUIRE_HTTPS, true),
  hstsMaxAgeSeconds: parsePositiveIntegerSetting(
    env.SECURITY_HSTS_MAX_AGE_SECONDS,
    defaultHstsMaxAgeSeconds,
  ),
  hstsIncludeSubDomains: parseBooleanSetting(
    env.SECURITY_HSTS_INCLUDE_SUBDOMAINS,
    true,
  ),
  hstsPreload: parseBooleanSetting(env.SECURITY_HSTS_PRELOAD, false),
  noStoreApiResponses: parseBooleanSetting(
    env.SECURITY_NO_STORE_API_RESPONSES,
    true,
  ),
});

export const getRequestProtocol = (request: Request) => {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim().toLowerCase() ?? '';
  }

  return new URL(request.url).protocol.replace(/:$/, '').toLowerCase();
};

export const isHttpsRequest = (request: Request) =>
  getRequestProtocol(request) === 'https';

export const buildHstsHeader = (config: TransportSecurityConfig) => {
  const directives = [`max-age=${config.hstsMaxAgeSeconds}`];
  if (config.hstsIncludeSubDomains) {
    directives.push('includeSubDomains');
  }
  if (config.hstsPreload) {
    directives.push('preload');
  }
  return directives.join('; ');
};

export const applyTransportSecurityHeaders = (
  headers: Record<string, string | number>,
  config: TransportSecurityConfig,
) => {
  headers['X-Content-Type-Options'] = 'nosniff';
  headers['Referrer-Policy'] = 'no-referrer';
  headers['Permissions-Policy'] =
    'camera=(), microphone=(), geolocation=(), payment=()';

  if (config.nodeEnv === 'production') {
    headers['Strict-Transport-Security'] = buildHstsHeader(config);
  }

  if (config.noStoreApiResponses) {
    headers['Cache-Control'] = 'no-store';
    headers.Pragma = 'no-cache';
    headers.Expires = '0';
  }
};

export const rejectInsecureTransport = (
  request: Request,
  config: TransportSecurityConfig,
) => {
  if (!config.requireHttps || isHttpsRequest(request)) {
    return undefined;
  }

  return Response.json(
    {
      code: 426,
      error: 'HTTPS is required for API requests.',
      success: false,
    },
    { status: 426 },
  );
};

export const transportSecurity = new Elysia({
  name: 'transport.security',
})
  .onBeforeHandle(({ request }) =>
    rejectInsecureTransport(request, buildTransportSecurityConfig()),
  )
  .onAfterHandle(({ set }) => {
    applyTransportSecurityHeaders(set.headers, buildTransportSecurityConfig());
  });
