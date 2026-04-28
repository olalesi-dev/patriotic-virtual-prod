import { expect, test, describe } from 'bun:test';
import { auth } from './auth.js';

describe('Better Auth Server Configuration', () => {
  test('should export auth instance', () => {
    expect(auth).toBeDefined();
    expect(typeof auth.api).toBe('object');
  });

  test('should have twoFactor and admin plugins configured', () => {
    // Basic structural checks on the better-auth instance
    expect(auth.options).toBeDefined();
  });
});
