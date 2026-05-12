import { describe, expect, it } from 'bun:test';
import {
  DOSESPOT_ON_BEHALF_SCOPE,
  hasRequiredDelegatedScopes,
  isDelegatedAccessUsable,
  normalizeDelegatedAccessScopes,
  parseDelegatedAccessDurationSeconds,
} from './service';

describe('delegated access helpers', () => {
  it('bounds delegated access duration', () => {
    expect(parseDelegatedAccessDurationSeconds(1)).toBe(300);
    expect(parseDelegatedAccessDurationSeconds(60 * 60)).toBe(60 * 60);
    expect(parseDelegatedAccessDurationSeconds(60 * 60 * 24)).toBe(60 * 60 * 8);
    expect(parseDelegatedAccessDurationSeconds('invalid', 900)).toBe(900);
  });

  it('normalizes scopes with safe defaults and deduplication', () => {
    expect(normalizeDelegatedAccessScopes(undefined)).toEqual([
      'phi:read:delegated',
    ]);
    expect(
      normalizeDelegatedAccessScopes([
        ' phi:read:delegated ',
        '',
        DOSESPOT_ON_BEHALF_SCOPE,
        DOSESPOT_ON_BEHALF_SCOPE,
      ]),
    ).toEqual(['phi:read:delegated', DOSESPOT_ON_BEHALF_SCOPE]);
  });

  it('requires every requested delegated scope', () => {
    const grant = {
      scopes: ['phi:read:delegated', DOSESPOT_ON_BEHALF_SCOPE],
    };

    expect(hasRequiredDelegatedScopes(grant, [DOSESPOT_ON_BEHALF_SCOPE])).toBe(
      true,
    );
    expect(
      hasRequiredDelegatedScopes(grant, [
        DOSESPOT_ON_BEHALF_SCOPE,
        'admin:users:write',
      ]),
    ).toBe(false);
  });

  it('only treats active unexpired delegated access as usable', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    expect(
      isDelegatedAccessUsable(
        {
          status: 'active',
          expiresAt: new Date('2026-01-01T00:01:00.000Z'),
        },
        now,
      ),
    ).toBe(true);
    expect(
      isDelegatedAccessUsable(
        {
          status: 'ended',
          expiresAt: new Date('2026-01-01T00:01:00.000Z'),
        },
        now,
      ),
    ).toBe(false);
    expect(
      isDelegatedAccessUsable(
        {
          status: 'active',
          expiresAt: new Date('2025-12-31T23:59:00.000Z'),
        },
        now,
      ),
    ).toBe(false);
  });
});
