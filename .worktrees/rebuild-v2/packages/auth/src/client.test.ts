import { expect, test, describe } from 'bun:test';
import { authClient } from './client.js';

describe('Better Auth Client Configuration', () => {
  test('should export authClient instance', () => {
    expect(authClient).toBeDefined();
    expect(authClient.signIn).toBeDefined();
    expect(authClient.signUp).toBeDefined();
  });
});
