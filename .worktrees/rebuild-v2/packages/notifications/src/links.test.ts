import { describe, expect, it } from 'bun:test';
import { buildPortalUrl, normalizeOrigin } from './links';

describe('notification links', () => {
  it('normalizes configured frontend origins', () => {
    expect(normalizeOrigin('https://example.com/patient')).toBe(
      'https://example.com',
    );
    expect(normalizeOrigin('not a url')).toBeUndefined();
  });

  it('builds portal URLs from FRONTEND_URL first', () => {
    expect(
      buildPortalUrl('/patient/scheduled', {
        FRONTEND_URL: 'https://portal.example.com/base',
        NEXT_PUBLIC_APP_URL: 'https://fallback.example.com',
      }),
    ).toBe('https://portal.example.com/patient/scheduled');
  });

  it('falls back to the production frontend URL', () => {
    expect(buildPortalUrl('/patient', {})).toBe(
      'https://patriotictelehealth.com/patient',
    );
  });
});
