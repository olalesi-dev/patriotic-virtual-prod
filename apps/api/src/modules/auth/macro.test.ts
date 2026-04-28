import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { authMacro } from './macro';

describe('Auth Macro', () => {
  it('should export authMacro and attach to Elysia instance without errors', () => {
    const app = new Elysia().use(authMacro);
    expect(app).toBeDefined();
  });

  it('should allow usage of isSignIn and allowedRoles macros in routes', () => {
    const app = new Elysia().use(authMacro).get('/', () => 'Hello', {
      isSignIn: true,
      allowedRoles: ['admin'],
    });

    expect(app).toBeDefined();
  });
});
