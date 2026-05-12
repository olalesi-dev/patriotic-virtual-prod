import { Elysia, t } from 'elysia';
import { and, eq } from 'drizzle-orm';
import { isUserMfaVerified } from '@workspace/auth/session-security';
import * as schema from '@workspace/db/schema';
import { env } from '@workspace/env';
import { db } from '../../db';
import { ForbiddenException, NotFoundException } from '../../utils/errors';
import { authMacro } from '../auth/macro';
import {
  buildBreakGlassExpiry,
  getActiveBreakGlassGrant,
  hasMfaOrCompensatingControl,
  logBreakGlassAuditEvent,
  normalizeBreakGlassScopes,
  notifyBreakGlassComplianceStaff,
  parseBreakGlassDurationSeconds,
} from './service';

const defaultDurationSeconds = parseBreakGlassDurationSeconds(
  env.AUTH_BREAK_GLASS_DURATION_SECONDS,
);

const assertNamedUserSession = (user: {
  id?: string | null;
  email?: string | null;
  organizationId?: string | null;
}) => {
  if (!user.id || !user.email || !user.organizationId) {
    throw new ForbiddenException('Named user session required');
  }
};

export const emergencyAccessController = new Elysia({
  prefix: '/emergency-access',
})
  .use(authMacro)
  .get(
    '/current',
    async ({ user }) => {
      assertNamedUserSession(user);
      return await getActiveBreakGlassGrant({
        userId: user.id,
        organizationId: user.organizationId!,
      });
    },
    {
      isSignIn: true,
      detail: {
        summary: 'Get active break-glass access grant',
        tags: ['Emergency Access'],
      },
    },
  )
  .post(
    '/activate',
    async ({ body, user, session, request, ip }) => {
      assertNamedUserSession(user);

      const grant = body.grantId
        ? await getActiveBreakGlassGrant({
            userId: user.id,
            organizationId: user.organizationId!,
          }).then((current) => (current?.id === body.grantId ? current : null))
        : await getActiveBreakGlassGrant({
            userId: user.id,
            organizationId: user.organizationId!,
          });

      if (!grant) {
        throw new NotFoundException('No active emergency access grant found');
      }

      const isMfaVerified = await isUserMfaVerified(db as never, user.id);
      if (
        !hasMfaOrCompensatingControl({
          isMfaVerified,
          compensatingControl: body.compensatingControl,
        })
      ) {
        throw new ForbiddenException(
          'MFA or a documented compensating control is required',
        );
      }

      const [activated] = await db
        .update(schema.breakGlassAccessGrants)
        .set({
          status: 'active',
          activatedById: user.id,
          activationReason: body.reason,
          compensatingControl: body.compensatingControl?.trim() || null,
          activatedAt: grant.activatedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.breakGlassAccessGrants.id, grant.id))
        .returning();

      await logBreakGlassAuditEvent({
        actor: user,
        actorRole: session.role,
        grantId: activated.id,
        targetUserId: activated.userId,
        event: 'break_glass_activated',
        request,
        ipAddress: ip,
        organizationId: activated.organizationId,
        details: {
          mfaVerified: isMfaVerified,
          compensatingControlRecorded: Boolean(
            body.compensatingControl?.trim(),
          ),
          scopes: activated.scopes,
          expiresAt: activated.expiresAt.toISOString(),
        },
      });

      const notification = await notifyBreakGlassComplianceStaff({
        organizationId: activated.organizationId,
        grantId: activated.id,
        actor: user,
        expiresAt: activated.expiresAt,
      });

      return { grant: activated, notification };
    },
    {
      isSignIn: true,
      requireStepUp: true,
      body: t.Object({
        grantId: t.Optional(t.String()),
        reason: t.String({ minLength: 10 }),
        compensatingControl: t.Optional(t.String({ minLength: 10 })),
      }),
      detail: {
        summary: 'Activate break-glass emergency access',
        tags: ['Emergency Access'],
      },
    },
  )
  .post(
    '/:id/end',
    async ({ params: { id }, body, user, session, request, ip }) => {
      assertNamedUserSession(user);

      const [ended] = await db
        .update(schema.breakGlassAccessGrants)
        .set({
          status: 'ended',
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.breakGlassAccessGrants.id, id),
            eq(schema.breakGlassAccessGrants.userId, user.id),
            eq(
              schema.breakGlassAccessGrants.organizationId,
              user.organizationId!,
            ),
          ),
        )
        .returning();

      if (!ended) {
        throw new NotFoundException('Emergency access grant not found');
      }

      await logBreakGlassAuditEvent({
        actor: user,
        actorRole: session.role,
        grantId: ended.id,
        targetUserId: ended.userId,
        event: 'break_glass_ended',
        request,
        ipAddress: ip,
        organizationId: ended.organizationId,
        details: {
          endReasonRecorded: Boolean(body.reason?.trim()),
        },
      });

      return ended;
    },
    {
      isSignIn: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        reason: t.Optional(t.String({ minLength: 10 })),
      }),
      detail: {
        summary: 'End break-glass emergency access',
        tags: ['Emergency Access'],
      },
    },
  );

export const adminEmergencyAccessController = new Elysia({
  prefix: '/emergency-access',
})
  .use(authMacro)
  .post(
    '/grants',
    async ({ body, user, session, request, ip }) => {
      assertNamedUserSession(user);

      const [target] = await db
        .select({
          id: schema.users.id,
          organizationId: schema.users.organizationId,
        })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.id, body.userId),
            eq(schema.users.organizationId, user.organizationId!),
          ),
        )
        .limit(1);

      if (!target) {
        throw new NotFoundException('User not found or unauthorized');
      }

      const durationSeconds = parseBreakGlassDurationSeconds(
        body.durationSeconds,
        defaultDurationSeconds,
      );
      const expiresAt = buildBreakGlassExpiry(durationSeconds);
      const scopes = normalizeBreakGlassScopes(body.scopes);

      const [grant] = await db
        .insert(schema.breakGlassAccessGrants)
        .values({
          userId: target.id,
          organizationId: target.organizationId!,
          grantedById: user.id,
          reason: body.reason,
          scopes,
          expiresAt,
        })
        .returning();

      await logBreakGlassAuditEvent({
        actor: user,
        actorRole: session.role,
        grantId: grant.id,
        targetUserId: grant.userId,
        event: 'break_glass_grant_created',
        request,
        ipAddress: ip,
        organizationId: grant.organizationId,
        details: {
          scopes,
          expiresAt: grant.expiresAt.toISOString(),
        },
      });

      return grant;
    },
    {
      isSignIn: true,
      allowedRoles: ['SuperAdmin', 'Admin'],
      requirePermissions: ['admin:users:write'],
      requireStepUp: true,
      body: t.Object({
        userId: t.String(),
        reason: t.String({ minLength: 10 }),
        durationSeconds: t.Optional(t.Number()),
        scopes: t.Optional(t.Array(t.String())),
      }),
      detail: {
        summary: 'Grant break-glass emergency access',
        tags: ['Admin', 'Emergency Access'],
      },
    },
  );
