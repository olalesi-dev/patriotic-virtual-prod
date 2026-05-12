import { describe, expect, it } from 'bun:test';
import {
  adminRoutes,
  canAccessRoute,
  getAdminRouteByPath,
} from './route-metadata';

describe('admin route metadata', () => {
  it('starts with only the dashboard page for the first visual pass', () => {
    expect(adminRoutes.map((route) => route.path)).toEqual(['/dashboard']);
  });

  it('resolves dashboard metadata by path', () => {
    expect(getAdminRouteByPath('/dashboard')?.label).toBe('Dashboard');
    expect(getAdminRouteByPath('/users')).toBeUndefined();
  });

  it('checks route access from permission claims', () => {
    const [dashboardRoute] = adminRoutes;

    expect(canAccessRoute(dashboardRoute, ['admin:dashboard:read'])).toBe(true);
    expect(canAccessRoute(dashboardRoute, [])).toBe(false);
  });
});
