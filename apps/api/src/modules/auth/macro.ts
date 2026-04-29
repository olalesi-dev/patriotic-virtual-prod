import { Elysia } from 'elysia';
import { auth } from '@workspace/auth';
import { UnauthorizedException, ForbiddenException } from '../../utils/errors';

type AuthUser = typeof auth.$Infer.Session.user;
type AuthSession = typeof auth.$Infer.Session.session;

export const authMacro = new Elysia({ name: 'auth.macro' }).macro({
  isSignIn(enabled: boolean) {
    if (!enabled) {
      return {};
    }
    return {
      async resolve({ request }) {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
          throw new UnauthorizedException('Unauthorized');
        }
        return {
          user: session.user as AuthUser,
          session: session.session as AuthSession,
        };
      },
    };
  },
  allowedRoles(roles: string[]) {
    return {
      beforeHandle(context: unknown) {
        const { session } = context as {
          session?: (AuthSession & { role?: string }) | null;
        };
        if (!session) {
          throw new UnauthorizedException('Unauthorized');
        }
        if (!session.role || !roles.includes(session.role)) {
          throw new ForbiddenException('Forbidden');
        }
      },
    };
  },
  requirePermissions(permissions: string[]) {
    return {
      beforeHandle(context: unknown) {
        const { session } = context as {
          session?: (AuthSession & { permissions?: string[] }) | null;
        };
        if (!session) {
          throw new UnauthorizedException('Unauthorized');
        }

        const sessionPermissions = session.permissions ?? [];

        const hasAllPermissions = permissions.every((permission) =>
          sessionPermissions.includes(permission),
        );

        if (!hasAllPermissions) {
          throw new ForbiddenException('Forbidden: Insufficient permissions');
        }
      },
    };
  },
});
