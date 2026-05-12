import type { AuthSecurityReason } from '@workspace/auth/session-security';
import * as auditService from '../audit/service';

export type AuthSecurityAuditEvent =
  | AuthSecurityReason
  | 'account_enabled'
  | 'session_idle_timeout';

interface AuditActor {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  organizationId?: string | null;
}

interface AuthSecurityAuditParams {
  actor: AuditActor;
  actorRole?: string | null;
  targetUserId: string;
  event: AuthSecurityAuditEvent;
  request?: Request;
  ipAddress?: string | null;
  organizationId?: string | null;
  details?: Record<string, unknown>;
}

const safeUrlPath = (request?: Request) => {
  if (!request?.url) {
    return undefined;
  }

  try {
    return new URL(request.url).pathname;
  } catch {
    return undefined;
  }
};

export const buildAuthSecurityAuditInput = ({
  actor,
  actorRole,
  targetUserId,
  event,
  request,
  ipAddress,
  organizationId,
  details,
}: AuthSecurityAuditParams) => ({
  actorId: actor.id,
  actorName: actor.name || actor.email || actor.id,
  actorRole: actorRole || actor.role || 'user',
  action: 'UPDATE',
  resourceType: 'Auth Security',
  resourceId: targetUserId,
  organizationId: organizationId || actor.organizationId || undefined,
  ipAddress: ipAddress || 'unknown',
  userAgent: request?.headers.get('user-agent') ?? undefined,
  isPhiAccess: false,
  details: {
    event,
    targetUserId,
    path: safeUrlPath(request),
    method: request?.method,
    ...details,
  },
});

export const logAuthSecurityEvent = async (
  params: AuthSecurityAuditParams,
) => {
  try {
    return await auditService.createAuditLog(
      buildAuthSecurityAuditInput(params),
    );
  } catch (error) {
    console.warn('Auth security audit log failed', {
      actorId: params.actor.id,
      targetUserId: params.targetUserId,
      event: params.event,
      error: error instanceof Error ? error.message : 'Unknown audit error',
    });
    return null;
  }
};
