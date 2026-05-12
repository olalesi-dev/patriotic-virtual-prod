import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_BREAK_GLASS_SCOPES,
  hasMfaOrCompensatingControl,
  isBreakGlassGrantUsable,
  normalizeBreakGlassScopes,
  parseBreakGlassDurationSeconds,
} from './service';

describe('break-glass emergency access helpers', () => {
  it('bounds emergency grant duration', () => {
    expect(parseBreakGlassDurationSeconds(60)).toBe(300);
    expect(parseBreakGlassDurationSeconds(60 * 60 * 12)).toBe(14_400);
    expect(parseBreakGlassDurationSeconds('900')).toBe(900);
  });

  it('normalizes scopes with a safe default', () => {
    expect(normalizeBreakGlassScopes(undefined)).toEqual(
      DEFAULT_BREAK_GLASS_SCOPES,
    );
    expect(normalizeBreakGlassScopes([' phi:read ', '', 'phi:read'])).toEqual([
      'phi:read',
    ]);
  });

  it('only treats unexpired granted or active grants as usable', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    expect(
      isBreakGlassGrantUsable(
        {
          status: 'active',
          expiresAt: new Date('2026-01-01T00:10:00.000Z'),
        },
        now,
      ),
    ).toBe(true);
    expect(
      isBreakGlassGrantUsable(
        {
          status: 'ended',
          expiresAt: new Date('2026-01-01T00:10:00.000Z'),
        },
        now,
      ),
    ).toBe(false);
    expect(
      isBreakGlassGrantUsable(
        {
          status: 'active',
          expiresAt: new Date('2025-12-31T23:59:59.000Z'),
        },
        now,
      ),
    ).toBe(false);
  });

  it('requires verified MFA or a documented compensating control', () => {
    expect(
      hasMfaOrCompensatingControl({
        isMfaVerified: true,
      }),
    ).toBe(true);
    expect(
      hasMfaOrCompensatingControl({
        isMfaVerified: false,
        compensatingControl: 'Phone approval from compliance lead',
      }),
    ).toBe(true);
    expect(
      hasMfaOrCompensatingControl({
        isMfaVerified: false,
        compensatingControl: 'short',
      }),
    ).toBe(false);
  });
});
