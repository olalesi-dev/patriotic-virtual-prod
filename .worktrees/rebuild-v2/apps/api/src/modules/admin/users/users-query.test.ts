import { describe, expect, it } from 'bun:test';
import { normalizeUserSortBy } from './users-query';

describe('admin user query helpers', () => {
  it('allows only supported user sort keys', () => {
    expect(normalizeUserSortBy('email')).toBe('email');
    expect(normalizeUserSortBy('role')).toBe('role');
    expect(normalizeUserSortBy('DROP TABLE users')).toBe('createdAt');
    expect(normalizeUserSortBy(undefined)).toBe('createdAt');
  });
});
