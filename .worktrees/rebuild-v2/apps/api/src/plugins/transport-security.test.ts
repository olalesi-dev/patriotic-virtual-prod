import { describe, expect, it } from 'bun:test';
import {
  applyTransportSecurityHeaders,
  buildHstsHeader,
  getRequestProtocol,
  isHttpsRequest,
  parseBooleanSetting,
  rejectInsecureTransport,
  type TransportSecurityConfig,
} from './transport-security';

const productionConfig: TransportSecurityConfig = {
  nodeEnv: 'production',
  requireHttps: true,
  hstsMaxAgeSeconds: 31_536_000,
  hstsIncludeSubDomains: true,
  hstsPreload: false,
  noStoreApiResponses: true,
};

describe('transport security', () => {
  it('parses boolean env settings with secure defaults', () => {
    expect(parseBooleanSetting(undefined, true)).toBe(true);
    expect(parseBooleanSetting('false', true)).toBe(false);
    expect(parseBooleanSetting('yes', false)).toBe(true);
  });

  it('detects HTTPS from direct URLs and proxy headers', () => {
    expect(
      isHttpsRequest(new Request('https://api.example.com/api/health')),
    ).toBe(true);
    expect(
      getRequestProtocol(
        new Request('http://api.example.com/api/health', {
          headers: { 'x-forwarded-proto': 'https,http' },
        }),
      ),
    ).toBe('https');
  });

  it('rejects production API requests that are not HTTPS', async () => {
    const response = rejectInsecureTransport(
      new Request('http://api.example.com/api/health'),
      productionConfig,
    );

    expect(response?.status).toBe(426);
    await expect(response?.json()).resolves.toEqual({
      code: 426,
      error: 'HTTPS is required for API requests.',
      success: false,
    });
  });

  it('applies HSTS and no-store headers for production API responses', () => {
    const headers: Record<string, string> = {};
    applyTransportSecurityHeaders(headers, productionConfig);

    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
    expect(headers['Cache-Control']).toBe('no-store');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('no-referrer');
  });

  it('builds preload HSTS only when explicitly configured', () => {
    expect(
      buildHstsHeader({
        ...productionConfig,
        hstsPreload: true,
      }),
    ).toBe('max-age=31536000; includeSubDomains; preload');
  });
});
