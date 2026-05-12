import { describe, expect, it } from 'bun:test';
import { hasPermissionDowngrade } from './roles.controller';

describe('Admin role permission routes', () => {
  it('detects permission downgrades when permissions are removed', () => {
    expect(hasPermissionDowngrade(['read', 'write'], ['read'])).toBe(true);
  });

  it('does not treat added permissions as a downgrade', () => {
    expect(hasPermissionDowngrade(['read'], ['read', 'write'])).toBe(false);
  });
});
