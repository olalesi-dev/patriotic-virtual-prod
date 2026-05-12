import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import {
  authMacro,
  isAdminAuthOnboardingPath,
  isStaffRole,
  parseBooleanFlag,
} from './macro';

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

  it('should allow usage of requireStepUp macro in routes', () => {
    const app = new Elysia().use(authMacro).post('/', () => 'Hello', {
      isSignIn: true,
      requireStepUp: true,
    });

    expect(app).toBeDefined();
  });

  it('should allow usage of requireEmergencyAccess macro in routes', () => {
    const app = new Elysia().use(authMacro).get('/', () => 'Hello', {
      isSignIn: true,
      requireEmergencyAccess: true,
    });

    expect(app).toBeDefined();
  });

  it('should allow usage of requireDelegatedAccess macro in routes', () => {
    const app = new Elysia().use(authMacro).get('/', () => 'Hello', {
      isSignIn: true,
      requireDelegatedAccess: ['phi:read:delegated'],
    });

    expect(app).toBeDefined();
  });

  it('parses auth hardening flags conservatively', () => {
    expect(parseBooleanFlag('true')).toBe(true);
    expect(parseBooleanFlag(' TRUE ')).toBe(true);
    expect(parseBooleanFlag('false')).toBe(false);
    expect(parseBooleanFlag(undefined)).toBe(false);
    expect(parseBooleanFlag(undefined, true)).toBe(true);
  });

  it('identifies staff roles that require MFA', () => {
    expect(isStaffRole('SuperAdmin')).toBe(true);
    expect(isStaffRole('Admin')).toBe(true);
    expect(isStaffRole('Provider')).toBe(true);
    expect(isStaffRole('Staff')).toBe(true);
    expect(isStaffRole('Patient')).toBe(false);
  });

  it('allows only admin onboarding auth paths to bypass password/MFA gating', () => {
    expect(
      isAdminAuthOnboardingPath(
        'http://localhost/api/auth/admin/session/requirements',
      ),
    ).toBe(true);
    expect(
      isAdminAuthOnboardingPath(
        'http://localhost/api/auth/admin/first-password',
      ),
    ).toBe(true);
    expect(
      isAdminAuthOnboardingPath('http://localhost/api/auth/mfa/factors'),
    ).toBe(true);
    expect(isAdminAuthOnboardingPath('http://localhost/api/admin/users')).toBe(
      false,
    );
    expect(isAdminAuthOnboardingPath('not a url')).toBe(false);
  });

  it('keeps step-up as a route macro so sensitive routes can opt in', () => {
    const app = new Elysia().use(authMacro).post('/admin-action', () => 'ok', {
      isSignIn: true,
      requireStepUp: true,
    });

    expect(app.routes.some((route) => route.path === '/admin-action')).toBe(
      true,
    );
  });
});
