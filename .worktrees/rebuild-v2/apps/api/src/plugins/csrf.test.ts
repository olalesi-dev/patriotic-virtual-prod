import { describe, expect, it } from 'bun:test';
import {
  hasBetterAuthCookie,
  isCsrfRequestAllowed,
  parseTrustedOrigins,
} from './csrf';

const trustedOrigins = ['https://app.example.com'];

const request = (headers: Record<string, string> = {}, method = 'POST') =>
  new Request('https://api.example.com/api/profile/me', {
    method,
    headers,
  });

describe('CSRF protection', () => {
  it('parses trusted origins from app and cors settings', () => {
    expect(
      parseTrustedOrigins(
        'https://app.example.com/path',
        'https://admin.example.com, http://localhost:52305',
      ),
    ).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
      'http://localhost:52305',
    ]);
  });

  it('detects Better Auth session cookies', () => {
    expect(
      hasBetterAuthCookie(
        'better-auth.session_token=abc; another_cookie=value',
      ),
    ).toBe(true);
    expect(hasBetterAuthCookie('analytics_id=abc')).toBe(false);
  });

  it('allows safe methods and webhook-style requests without auth cookies', () => {
    expect(isCsrfRequestAllowed(request({}, 'GET'), trustedOrigins)).toBe(true);
    expect(isCsrfRequestAllowed(request(), trustedOrigins)).toBe(true);
  });

  it('allows bearer authenticated mutation requests', () => {
    expect(
      isCsrfRequestAllowed(
        request({
          authorization: 'Bearer token',
          cookie: 'better-auth.session_token=abc',
        }),
        trustedOrigins,
      ),
    ).toBe(true);
  });

  it('allows cookie authenticated mutations from trusted origin or referer', () => {
    expect(
      isCsrfRequestAllowed(
        request({
          origin: 'https://app.example.com',
          cookie: 'better-auth.session_token=abc',
        }),
        trustedOrigins,
      ),
    ).toBe(true);

    expect(
      isCsrfRequestAllowed(
        request({
          referer: 'https://app.example.com/profile',
          cookie: 'better-auth.session_token=abc',
        }),
        trustedOrigins,
      ),
    ).toBe(true);
  });

  it('rejects cookie authenticated mutations from untrusted origins', () => {
    expect(
      isCsrfRequestAllowed(
        request({
          origin: 'https://evil.example.com',
          cookie: 'better-auth.session_token=abc',
        }),
        trustedOrigins,
      ),
    ).toBe(false);

    expect(
      isCsrfRequestAllowed(
        request({
          cookie: 'better-auth.session_token=abc',
        }),
        trustedOrigins,
      ),
    ).toBe(false);
  });
});
