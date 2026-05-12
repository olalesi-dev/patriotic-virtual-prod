import { IconLayoutDashboard, type Icon } from '@tabler/icons-react';

export type AdminRouteId = 'dashboard';

export interface AdminRouteMetadata {
  id: AdminRouteId;
  path: string;
  label: string;
  description: string;
  icon: Icon;
  permissions: string[];
}

export const adminRoutes = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Operational overview for admin staff.',
    icon: IconLayoutDashboard,
    permissions: ['admin:dashboard:read'],
  },
] satisfies AdminRouteMetadata[];

export const getAdminRouteByPath = (pathname: string) =>
  adminRoutes.find((route) => route.path === pathname);

export const canAccessRoute = (
  route: AdminRouteMetadata,
  permissions: string[],
) => route.permissions.every((permission) => permissions.includes(permission));
