import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import * as schema from '@workspace/db/schema';
import { db } from '../../db';
import * as auditService from '../audit/service';

export const DEFAULT_DELEGATED_ACCESS_DURATION_SECONDS = 60 * 60;
export const MIN_DELEGATED_ACCESS_DURATION_SECONDS = 60 * 5;
export const MAX_DELEGATED_ACCESS_DURATION_SECONDS = 60 * 60 * 8;
export const DEFAULT_DELEGATED_ACCESS_SCOPES = ['phi:read:delegated'];
export const DOSESPOT_ON_BEHALF_SCOPE = 'dosespot:on-behalf-of';

export type DelegatedAccessStatus = 'active' | 'ended' | 'expired';

export interface DelegatedAccessActor {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  organizationId?: string | null;
}

export const parseDelegatedAccessDurationSeconds = (
  value: number | string | undefined,
  fallback = DEFAULT_DELEGATED_ACCESS_DURATION_SECONDS,
) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return fallback;
  }

  return Math.min(
    Math.max(parsed, MIN_DELEGATED_ACCESS_DURATION_SECONDS),
    MAX_DELEGATED_ACCESS_DURATION_SECONDS,
  );
};

export const normalizeDelegatedAccessScopes = (scopes?: unknown) => {
  if (!Array.isArray(scopes)) {
    return DEFAULT_DELEGATED_ACCESS_SCOPES;
  }

  const normalized = scopes
    .filter((scope): scope is string => typeof scope === 'string')
    .map((scope) => scope.trim())
    .filter(Boolean);

  return normalized.length > 0
    ? [...new Set(normalized)]
    : DEFAULT_DELEGATED_ACCESS_SCOPES;
};

export const hasRequiredDelegatedScopes = (
  grant: { scopes: string[] } | null | undefined,
  requiredScopes: string[],
) => {
  if (!grant) {
    return false;
  }

  if (requiredScopes.length === 0) {
    return true;
  }

  return requiredScopes.every((scope) => grant.scopes.includes(scope));
};

export const buildDelegatedAccessExpiry = (
  durationSeconds: number,
  now = new Date(),
) => new Date(now.getTime() + durationSeconds * 1000);

export const isDelegatedAccessUsable = (
  grant:
    | {
        status: string;
        expiresAt: Date | string;
        endedAt?: Date | string | null;
      }
    | null
    | undefined,
  now = new Date(),
) => {
  if (!grant || grant.endedAt || grant.status !== 'active') {
    return false;
  }

  return new Date(grant.expiresAt).getTime() > now.getTime();
};

export const getActiveDelegatedAccess = async ({
  actorUserId,
  organizationId,
  scopes = [],
  now = new Date(),
}: {
  actorUserId: string;
  organizationId: string;
  scopes?: string[];
  now?: Date;
}) => {
  const grants = await db
    .select()
    .from(schema.delegatedAccessSessions)
    .where(
      and(
        eq(schema.delegatedAccessSessions.actorUserId, actorUserId),
        eq(schema.delegatedAccessSessions.organizationId, organizationId),
        eq(schema.delegatedAccessSessions.status, 'active'),
        gt(schema.delegatedAccessSessions.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.delegatedAccessSessions.createdAt))
    .limit(10);

  return (
    grants.find((grant) => hasRequiredDelegatedScopes(grant, scopes)) ?? null
  );
};

export const resolveDoseSpotOnBehalfOf = async ({
  actorUserId,
  organizationId,
}: {
  actorUserId: string;
  organizationId: string;
}) => {
  const grant = await getActiveDelegatedAccess({
    actorUserId,
    organizationId,
    scopes: [DOSESPOT_ON_BEHALF_SCOPE],
  });

  if (!grant?.targetProviderId) {
    return null;
  }

  const [provider] = await db
    .select({
      id: schema.providers.id,
      doseSpotClinicianId: schema.providers.doseSpotClinicianId,
    })
    .from(schema.providers)
    .where(
      and(
        eq(schema.providers.id, grant.targetProviderId),
        eq(schema.providers.organizationId, organizationId),
      ),
    )
    .limit(1);

  const clinicianId = Number(provider?.doseSpotClinicianId);
  if (!Number.isSafeInteger(clinicianId) || clinicianId <= 0) {
    return null;
  }

  return {
    delegationId: grant.id,
    targetProviderId: grant.targetProviderId,
    clinicianId,
    scopes: grant.scopes,
  };
};

export const logDelegatedAccessAuditEvent = async ({
  actor,
  actorRole,
  delegationId,
  targetUserId,
  targetPatientId,
  targetProviderId,
  event,
  request,
  ipAddress,
  organizationId,
  details,
}: {
  actor: DelegatedAccessActor;
  actorRole?: string | null;
  delegationId: string;
  targetUserId?: string | null;
  targetPatientId?: string | null;
  targetProviderId?: string | null;
  event:
    | 'delegated_access_created'
    | 'delegated_access_ended'
    | 'delegated_access_route_access'
    | 'delegated_access_dosespot_on_behalf';
  request?: Request;
  ipAddress?: string | null;
  organizationId?: string | null;
  details?: Record<string, unknown>;
}) => {
  try {
    return await auditService.createAuditLog({
      actorId: actor.id,
      actorName: actor.name || actor.email || actor.id,
      actorRole: actorRole || actor.role || 'user',
      action: 'UPDATE',
      resourceType: 'Delegated Access',
      resourceId: delegationId,
      organizationId: organizationId || actor.organizationId || undefined,
      ipAddress: ipAddress || 'unknown',
      userAgent: request?.headers.get('user-agent') ?? undefined,
      isPhiAccess: true,
      details: {
        event,
        delegationId,
        targetUserId,
        targetPatientId,
        targetProviderId,
        reasonRecorded: true,
        path: request ? new URL(request.url).pathname : undefined,
        method: request?.method,
        ...details,
      },
    });
  } catch (error) {
    console.warn('Delegated access audit log failed', {
      actorId: actor.id,
      delegationId,
      event,
      error: error instanceof Error ? error.message : 'Unknown audit error',
    });
    return null;
  }
};
