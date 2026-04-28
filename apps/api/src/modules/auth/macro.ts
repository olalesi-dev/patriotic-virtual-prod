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
        const { user } = context as { user?: AuthUser | null };
        if (!user) {
          throw new UnauthorizedException('Unauthorized');
        }
        if (!user.role || !roles.includes(user.role)) {
          throw new ForbiddenException('Forbidden');
        }
      },
    };
  },
  requirePermissions(permissions: string[]) {
    return {
      beforeHandle(context: unknown) {
        const { user } = context as {
          user?: AuthUser | null;
          permissions?: string[];
        };
        if (!user) {
          throw new UnauthorizedException('Unauthorized');
        }
        // TODO: In a real implementation, either attach permissions to the user object
        // During session resolution or perform a DB lookup here.
        // For now, we assume the user object might have a mocked permissions array.
        const userPermissions =
          context && typeof context === 'object' && 'permissions' in context
            ? (context as { permissions: string[] }).permissions
            : [];

        const hasAllPermissions = permissions.every((permission) =>
          userPermissions.includes(permission),
        );

        if (!hasAllPermissions) {
          throw new ForbiddenException('Forbidden: Insufficient permissions');
        }
      },
    };
  },
});
