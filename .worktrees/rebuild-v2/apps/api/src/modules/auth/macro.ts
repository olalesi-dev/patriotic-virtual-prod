import { Elysia } from 'elysia';
import { eq } from 'drizzle-orm';
import { auth } from '@workspace/auth/auth';
import {
  isSessionTokenVersionCurrent,
  isSessionStepUpFresh,
  isSessionWithinIdleTimeout,
  isUserMfaVerified,
  revokeSession,
  touchSessionActivity,
} from '@workspace/auth/session-security';
import { env } from '@workspace/env';
import * as schema from '@workspace/db/schema';
import { db } from '../../db';
import { UnauthorizedException, ForbiddenException } from '../../utils/errors';
import {
  getActiveBreakGlassGrant,
  logBreakGlassAuditEvent,
} from '../emergency-access/service';
import {
  getActiveDelegatedAccess,
  logDelegatedAccessAuditEvent,
} from '../delegated-access/service';
import { resolveFirebaseCompatAuth } from './firebase-compat';

type AuthUser = typeof auth.$Infer.Session.user;
type AuthSession = typeof auth.$Infer.Session.session;
type AuthSessionClaims = AuthSession & {
  tokenVersion?: number;
  role?: string | null;
  permissions?: string[];
};

const parseNonNegativeInteger = (
  value: string | undefined,
  fallback: number,
) => {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const idleTimeoutSeconds = parseNonNegativeInteger(
  env.AUTH_SESSION_IDLE_TIMEOUT_SECONDS,
  60 * 15,
);
const idleUpdateThrottleSeconds = parseNonNegativeInteger(
  env.AUTH_SESSION_IDLE_UPDATE_THROTTLE_SECONDS,
  60,
);
const stepUpMaxAgeSeconds = parseNonNegativeInteger(
  env.AUTH_STEP_UP_MAX_AGE_SECONDS,
  60 * 5,
);

export const parseBooleanFlag = (
  value: string | undefined,
  fallback = false,
) => {
  if (!value?.trim()) {
    return fallback;
  }
  return value.trim().toLowerCase() === 'true';
};

export const isStaffRole = (role?: string | null) =>
  ['superadmin', 'admin', 'provider', 'staff'].includes(
    role?.trim().toLowerCase() ?? '',
  );

const requireStaffMfa = parseBooleanFlag(env.AUTH_REQUIRE_STAFF_MFA, true);
const requireStepUpGlobally = parseBooleanFlag(env.AUTH_REQUIRE_STEP_UP);

export const adminAuthOnboardingPaths = new Set([
  '/api/auth/admin/session/requirements',
  '/api/auth/admin/first-password',
  '/api/auth/mfa/factors',
]);

export const isAdminAuthOnboardingPath = (url: string) => {
  try {
    return adminAuthOnboardingPaths.has(new URL(url).pathname);
  } catch {
    return false;
  }
};

export const authMacro = new Elysia({ name: 'auth.macro' }).macro({
  isSignIn(enabled: boolean) {
    if (!enabled) {
      return {};
    }
    return {
      async resolve({ request }) {
        // Load test bypass
        const authHeader = request.headers.get('authorization');
        const isLoadTestAllowed = process.env.ALLOW_LOAD_TEST_BYPASS === 'true';

        if (isLoadTestAllowed && authHeader === 'Bearer mock-load-test-token') {
          return {
            user: {
              id: 'load-test-user',
              name: 'Load Test User',
              email: 'loadtest@example.com',
              role: 'SuperAdmin',
              organizationId: 'default-org-id',
            } as any,
            session: {
              id: 'load-test-session',
              userId: 'load-test-user',
              role: 'SuperAdmin',
              permissions: ['*'],
            } as any,
          };
        }

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
          const firebaseSession = await resolveFirebaseCompatAuth(
            request.headers,
          );
          if (firebaseSession) {
            return firebaseSession;
          }
          throw new UnauthorizedException('Unauthorized');
        }
        const isCurrentSession = await isSessionTokenVersionCurrent(
          db as never,
          session.session as AuthSession & { tokenVersion?: number },
        );
        if (!isCurrentSession) {
          throw new UnauthorizedException('Session has been revoked');
        }
        const authSession = session.session as AuthSessionClaims;
        const isOnboardingPath = isAdminAuthOnboardingPath(request.url);
        const [userPolicy] = await db
          .select({ mustChangePassword: schema.users.mustChangePassword })
          .from(schema.users)
          .where(eq(schema.users.id, authSession.userId))
          .limit(1);

        if (userPolicy?.mustChangePassword && !isOnboardingPath) {
          throw new ForbiddenException('Password change required');
        }

        const isWithinIdleTimeout = await isSessionWithinIdleTimeout(
          db as never,
          authSession,
          { idleTimeoutSeconds },
        );
        if (!isWithinIdleTimeout) {
          await revokeSession(db as never, authSession.id);
          throw new UnauthorizedException('Session expired');
        }
        await touchSessionActivity(db as never, authSession, {
          updateThrottleSeconds: idleUpdateThrottleSeconds,
        });
        if (
          requireStaffMfa &&
          isStaffRole(authSession.role) &&
          !isOnboardingPath &&
          !(await isUserMfaVerified(db as never, authSession.userId))
        ) {
          throw new ForbiddenException('MFA enrollment required');
        }

        return {
          user: session.user as AuthUser,
          session: authSession,
        };
      },
    };
  },
  requireStepUp(enabled: boolean) {
    if (!enabled) {
      return {};
    }

    return {
      async beforeHandle(context: unknown) {
        if (!requireStepUpGlobally) {
          return;
        }

        const { session } = context as {
          session?: AuthSession | null;
        };
        if (!session) {
          throw new UnauthorizedException('Unauthorized');
        }

        const isFresh = await isSessionStepUpFresh(db as never, session, {
          maxAgeSeconds: stepUpMaxAgeSeconds,
        });
        if (!isFresh) {
          throw new ForbiddenException('Step-up authentication required');
        }
      },
    };
  },
  requireEmergencyAccess(enabled: boolean) {
    if (!enabled) {
      return {};
    }

    return {
      async beforeHandle(context: unknown) {
        const { user, session } = context as {
          user?: (AuthUser & { organizationId?: string | null }) | null;
          session?: (AuthSession & { userId?: string }) | null;
          emergencyAccessGrant?: unknown;
        };
        if (!user || !session?.userId || !user.organizationId) {
          throw new UnauthorizedException('Unauthorized');
        }

        const grant = await getActiveBreakGlassGrant({
          userId: session.userId,
          organizationId: user.organizationId,
        });

        if (!grant) {
          throw new ForbiddenException('Emergency access required');
        }

        (context as { emergencyAccessGrant?: unknown }).emergencyAccessGrant =
          grant;
      },
      async afterHandle(context: unknown) {
        const { user, session, request, ip, emergencyAccessGrant } =
          context as {
            user?: (AuthUser & { organizationId?: string | null }) | null;
            session?: (AuthSession & { role?: string; userId?: string }) | null;
            request?: Request;
            ip?: string;
            emergencyAccessGrant?: { id: string; userId: string };
          };

        if (!user || !session || !emergencyAccessGrant) {
          return;
        }

        await logBreakGlassAuditEvent({
          actor: user,
          actorRole: session.role,
          grantId: emergencyAccessGrant.id,
          targetUserId: emergencyAccessGrant.userId,
          event: 'break_glass_route_access',
          request,
          ipAddress: ip,
          organizationId: user.organizationId,
        });
      },
    };
  },
  requireDelegatedAccess(scopes: string[]) {
    return {
      async beforeHandle(context: unknown) {
        const { user, session } = context as {
          user?: (AuthUser & { organizationId?: string | null }) | null;
          session?: (AuthSession & { userId?: string }) | null;
          delegatedAccessSession?: unknown;
        };
        if (!user || !session?.userId || !user.organizationId) {
          throw new UnauthorizedException('Unauthorized');
        }

        const delegation = await getActiveDelegatedAccess({
          actorUserId: session.userId,
          organizationId: user.organizationId,
          scopes,
        });

        if (!delegation) {
          throw new ForbiddenException('Delegated access required');
        }

        (
          context as { delegatedAccessSession?: unknown }
        ).delegatedAccessSession = delegation;
      },
      async afterHandle(context: unknown) {
        const { user, session, request, ip, delegatedAccessSession } =
          context as {
            user?: (AuthUser & { organizationId?: string | null }) | null;
            session?: (AuthSession & { role?: string; userId?: string }) | null;
            request?: Request;
            ip?: string;
            delegatedAccessSession?: {
              id: string;
              targetUserId?: string | null;
              targetPatientId?: string | null;
              targetProviderId?: string | null;
            };
          };

        if (!user || !session || !delegatedAccessSession) {
          return;
        }

        await logDelegatedAccessAuditEvent({
          actor: user,
          actorRole: session.role,
          delegationId: delegatedAccessSession.id,
          targetUserId: delegatedAccessSession.targetUserId,
          targetPatientId: delegatedAccessSession.targetPatientId,
          targetProviderId: delegatedAccessSession.targetProviderId,
          event: 'delegated_access_route_access',
          request,
          ipAddress: ip,
          organizationId: user.organizationId,
        });
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

        if (sessionPermissions.includes('*')) {
          return;
        }

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
