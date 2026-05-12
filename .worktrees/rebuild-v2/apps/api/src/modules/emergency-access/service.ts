import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import { NotificationQueue } from '@workspace/queue/notification-queue';
import { NotificationService } from '@workspace/notifications';
import * as schema from '@workspace/db/schema';
import { db } from '../../db';
import * as auditService from '../audit/service';

export const DEFAULT_BREAK_GLASS_DURATION_SECONDS = 60 * 60;
export const MIN_BREAK_GLASS_DURATION_SECONDS = 60 * 5;
export const MAX_BREAK_GLASS_DURATION_SECONDS = 60 * 60 * 4;
export const DEFAULT_BREAK_GLASS_SCOPES = ['phi:read:emergency'];

export type BreakGlassGrantStatus = 'granted' | 'active' | 'ended' | 'expired';

export interface BreakGlassActor {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  organizationId?: string | null;
}

export type BreakGlassAuditEvent =
  | 'break_glass_grant_created'
  | 'break_glass_activated'
  | 'break_glass_ended'
  | 'break_glass_route_access';

export const parseBreakGlassDurationSeconds = (
  value: number | string | undefined,
  fallback = DEFAULT_BREAK_GLASS_DURATION_SECONDS,
) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return fallback;
  }

  return Math.min(
    Math.max(parsed, MIN_BREAK_GLASS_DURATION_SECONDS),
    MAX_BREAK_GLASS_DURATION_SECONDS,
  );
};

export const normalizeBreakGlassScopes = (scopes?: unknown) => {
  if (!Array.isArray(scopes)) {
    return DEFAULT_BREAK_GLASS_SCOPES;
  }

  const normalized = scopes
    .filter((scope): scope is string => typeof scope === 'string')
    .map((scope) => scope.trim())
    .filter(Boolean);

  return normalized.length > 0
    ? [...new Set(normalized)]
    : DEFAULT_BREAK_GLASS_SCOPES;
};

export const buildBreakGlassExpiry = (
  durationSeconds: number,
  now = new Date(),
) => new Date(now.getTime() + durationSeconds * 1000);

export const isBreakGlassGrantUsable = (
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
  if (!grant || grant.endedAt) {
    return false;
  }

  if (!['granted', 'active'].includes(grant.status)) {
    return false;
  }

  return new Date(grant.expiresAt).getTime() > now.getTime();
};

export const hasMfaOrCompensatingControl = ({
  isMfaVerified,
  compensatingControl,
}: {
  isMfaVerified: boolean;
  compensatingControl?: string | null;
}) => isMfaVerified || (compensatingControl?.trim().length ?? 0) >= 10;

export const getActiveBreakGlassGrant = async ({
  userId,
  organizationId,
  now = new Date(),
}: {
  userId: string;
  organizationId: string;
  now?: Date;
}) => {
  const [grant] = await db
    .select()
    .from(schema.breakGlassAccessGrants)
    .where(
      and(
        eq(schema.breakGlassAccessGrants.userId, userId),
        eq(schema.breakGlassAccessGrants.organizationId, organizationId),
        inArray(schema.breakGlassAccessGrants.status, ['granted', 'active']),
        gt(schema.breakGlassAccessGrants.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.breakGlassAccessGrants.createdAt))
    .limit(1);

  return grant ?? null;
};

export const logBreakGlassAuditEvent = async ({
  actor,
  actorRole,
  grantId,
  targetUserId,
  event,
  request,
  ipAddress,
  organizationId,
  details,
}: {
  actor: BreakGlassActor;
  actorRole?: string | null;
  grantId: string;
  targetUserId: string;
  event: BreakGlassAuditEvent;
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
      resourceType: 'Emergency Access',
      resourceId: grantId,
      organizationId: organizationId || actor.organizationId || undefined,
      ipAddress: ipAddress || 'unknown',
      userAgent: request?.headers.get('user-agent') ?? undefined,
      isPhiAccess: true,
      details: {
        event,
        grantId,
        targetUserId,
        reasonRecorded: true,
        path: request ? new URL(request.url).pathname : undefined,
        method: request?.method,
        ...details,
      },
    });
  } catch (error) {
    console.warn('Break-glass audit log failed', {
      actorId: actor.id,
      grantId,
      targetUserId,
      event,
      error: error instanceof Error ? error.message : 'Unknown audit error',
    });
    return null;
  }
};

const notificationQueue = new NotificationQueue();
const notificationService = new NotificationService(db, notificationQueue);

export const notifyBreakGlassComplianceStaff = async ({
  organizationId,
  grantId,
  actor,
  expiresAt,
}: {
  organizationId: string;
  grantId: string;
  actor: BreakGlassActor;
  expiresAt: Date;
}) => {
  const recipients = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(
      and(
        eq(schema.users.organizationId, organizationId),
        inArray(schema.roles.name, ['SuperAdmin', 'Admin']),
      ),
    );

  if (recipients.length === 0) {
    return { status: 'no_recipients' as const };
  }

  try {
    const result = await notificationService.notify({
      topicKey: 'SECURITY_BREAK_GLASS_ACTIVATED',
      entityId: grantId,
      recipientIds: recipients.map((recipient) => recipient.id),
      channels: ['in_app'],
      actorId: actor.id,
      actorName: actor.name || actor.email || actor.id,
      source: 'api.emergency-access',
      templateData: {
        actorName: actor.name || actor.email || actor.id,
        grantId,
        expiresAt: expiresAt.toISOString(),
      },
      metadata: {
        organizationId,
      },
    });
    return { status: 'queued' as const, result };
  } catch (error) {
    console.warn('Break-glass compliance notification failed', {
      actorId: actor.id,
      grantId,
      error:
        error instanceof Error ? error.message : 'Unknown notification error',
    });
    return { status: 'failed' as const };
  }
};
