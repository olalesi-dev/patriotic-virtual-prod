import { describe, expect, it } from 'bun:test';
import { normalizeAdminSessionSortBy } from './sessions-query';

describe('admin session query helpers', () => {
  it('allows only supported session sort keys', () => {
    expect(normalizeAdminSessionSortBy('email')).toBe('email');
    expect(normalizeAdminSessionSortBy('loginMethod')).toBe('loginMethod');
    expect(normalizeAdminSessionSortBy('unexpected')).toBe('loggedInAt');
    expect(normalizeAdminSessionSortBy(undefined)).toBe('loggedInAt');
  });
});
