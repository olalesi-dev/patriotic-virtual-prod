import { describe, expect, it } from 'bun:test';
import { app } from '../../index';

const routeFor = (method: string, path: string) =>
  app.routes.find((route) => route.method === method && route.path === path);

const adminAuthRoutes = [
  {
    method: 'GET',
    path: '/api/auth/admin/session/requirements',
    successStatus: '200',
  },
  {
    method: 'POST',
    path: '/api/auth/admin/users',
    successStatus: '201',
  },
  {
    method: 'POST',
    path: '/api/auth/admin/first-password',
    successStatus: '200',
  },
  {
    method: 'POST',
    path: '/api/auth/admin/password-reset/requests',
    successStatus: '201',
  },
  {
    method: 'GET',
    path: '/api/auth/admin/password-reset/requests',
    successStatus: '200',
  },
  {
    method: 'POST',
    path: '/api/auth/admin/password-reset/requests/:id/approve',
    successStatus: '200',
  },
  {
    method: 'POST',
    path: '/api/auth/admin/password-reset/requests/:id/reject',
    successStatus: '200',
  },
] as const;

describe('admin auth controller contracts', () => {
  it('registers admin authentication routes under /api/auth/admin', () => {
    for (const route of adminAuthRoutes) {
      expect(routeFor(route.method, route.path)).toBeDefined();
    }
  });

  it('does not register admin signup routes', () => {
    expect(routeFor('POST', '/api/auth/admin/signup')).toBeUndefined();
    expect(routeFor('POST', '/api/auth/admin/register')).toBeUndefined();
  });

  it('documents success and error response shapes for OpenAPI', () => {
    for (const expectedRoute of adminAuthRoutes) {
      const route = routeFor(expectedRoute.method, expectedRoute.path);
      expect(typeof route?.hooks.detail?.summary).toBe('string');
      expect(typeof route?.hooks.detail?.description).toBe('string');
      expect(Object.keys(route?.hooks.response ?? {})).toContain(
        expectedRoute.successStatus,
      );
      expect(Object.keys(route?.hooks.response ?? {})).toContain('400');
      expect(Object.keys(route?.hooks.response ?? {})).toContain('500');
    }
  });

  it('does not allow unauthenticated admin user creation', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/auth/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'new-admin@example.test',
          name: 'New Admin',
          role: 'admin',
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });
});
