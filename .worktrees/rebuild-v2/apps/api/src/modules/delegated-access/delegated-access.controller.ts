import { Elysia, t } from 'elysia';
import { and, eq } from 'drizzle-orm';
import * as schema from '@workspace/db/schema';
import { env } from '@workspace/env';
import { db } from '../../db';
import { ForbiddenException, NotFoundException } from '../../utils/errors';
import { authMacro } from '../auth/macro';
import {
  buildDelegatedAccessExpiry,
  getActiveDelegatedAccess,
  logDelegatedAccessAuditEvent,
  normalizeDelegatedAccessScopes,
  parseDelegatedAccessDurationSeconds,
} from './service';

const defaultDurationSeconds = parseDelegatedAccessDurationSeconds(
  env.AUTH_DELEGATED_ACCESS_DURATION_SECONDS,
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

const hasAnyTarget = (body: {
  targetUserId?: string;
  targetPatientId?: string;
  targetProviderId?: string;
}) =>
  Boolean(body.targetUserId || body.targetPatientId || body.targetProviderId);

const assertUserInOrganization = async (
  userId: string,
  organizationId: string,
) => {
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, userId),
        eq(schema.users.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!user) {
    throw new NotFoundException('User not found or unauthorized');
  }
};

const assertOptionalTargetInOrganization = async ({
  targetUserId,
  targetPatientId,
  targetProviderId,
  organizationId,
}: {
  targetUserId?: string;
  targetPatientId?: string;
  targetProviderId?: string;
  organizationId: string;
}) => {
  if (targetUserId) {
    await assertUserInOrganization(targetUserId, organizationId);
  }

  if (targetPatientId) {
    const [patient] = await db
      .select({ id: schema.patients.id })
      .from(schema.patients)
      .where(
        and(
          eq(schema.patients.id, targetPatientId),
          eq(schema.patients.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!patient) {
      throw new NotFoundException('Patient not found or unauthorized');
    }
  }

  if (targetProviderId) {
    const [provider] = await db
      .select({ id: schema.providers.id })
      .from(schema.providers)
      .where(
        and(
          eq(schema.providers.id, targetProviderId),
          eq(schema.providers.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!provider) {
      throw new NotFoundException('Provider not found or unauthorized');
    }
  }
};

export const delegatedAccessController = new Elysia({
  prefix: '/delegated-access',
})
  .use(authMacro)
  .get(
    '/current',
    async ({ user }) => {
      assertNamedUserSession(user);
      return await getActiveDelegatedAccess({
        actorUserId: user.id,
        organizationId: user.organizationId!,
      });
    },
    {
      isSignIn: true,
      detail: {
        summary: 'Get active delegated access session',
        tags: ['Delegated Access'],
      },
    },
  )
  .post(
    '/:id/end',
    async ({ params: { id }, body, user, session, request, ip }) => {
      assertNamedUserSession(user);

      const [ended] = await db
        .update(schema.delegatedAccessSessions)
        .set({
          status: 'ended',
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.delegatedAccessSessions.id, id),
            eq(schema.delegatedAccessSessions.actorUserId, user.id),
            eq(
              schema.delegatedAccessSessions.organizationId,
              user.organizationId!,
            ),
          ),
        )
        .returning();

      if (!ended) {
        throw new NotFoundException('Delegated access session not found');
      }

      await logDelegatedAccessAuditEvent({
        actor: user,
        actorRole: session.role,
        delegationId: ended.id,
        targetUserId: ended.targetUserId,
        targetPatientId: ended.targetPatientId,
        targetProviderId: ended.targetProviderId,
        event: 'delegated_access_ended',
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
        summary: 'End delegated access session',
        tags: ['Delegated Access'],
      },
    },
  );

export const adminDelegatedAccessController = new Elysia({
  prefix: '/delegated-access',
})
  .use(authMacro)
  .post(
    '/sessions',
    async ({ body, user, session, request, ip }) => {
      assertNamedUserSession(user);

      if (!hasAnyTarget(body)) {
        throw new ForbiddenException(
          'At least one delegated access target is required',
        );
      }

      await assertUserInOrganization(body.actorUserId, user.organizationId!);
      await assertOptionalTargetInOrganization({
        targetUserId: body.targetUserId,
        targetPatientId: body.targetPatientId,
        targetProviderId: body.targetProviderId,
        organizationId: user.organizationId!,
      });

      const durationSeconds = parseDelegatedAccessDurationSeconds(
        body.durationSeconds,
        defaultDurationSeconds,
      );
      const expiresAt = buildDelegatedAccessExpiry(durationSeconds);
      const scopes = normalizeDelegatedAccessScopes(body.scopes);

      const [delegation] = await db
        .insert(schema.delegatedAccessSessions)
        .values({
          organizationId: user.organizationId!,
          actorUserId: body.actorUserId,
          targetUserId: body.targetUserId,
          targetPatientId: body.targetPatientId,
          targetProviderId: body.targetProviderId,
          grantedById: user.id,
          reason: body.reason,
          scopes,
          expiresAt,
        })
        .returning();

      await logDelegatedAccessAuditEvent({
        actor: user,
        actorRole: session.role,
        delegationId: delegation.id,
        targetUserId: delegation.targetUserId,
        targetPatientId: delegation.targetPatientId,
        targetProviderId: delegation.targetProviderId,
        event: 'delegated_access_created',
        request,
        ipAddress: ip,
        organizationId: delegation.organizationId,
        details: {
          actorUserId: delegation.actorUserId,
          scopes,
          expiresAt: delegation.expiresAt.toISOString(),
        },
      });

      return delegation;
    },
    {
      isSignIn: true,
      allowedRoles: ['SuperAdmin', 'Admin'],
      requirePermissions: ['admin:users:write'],
      requireStepUp: true,
      body: t.Object({
        actorUserId: t.String(),
        targetUserId: t.Optional(t.String()),
        targetPatientId: t.Optional(t.String()),
        targetProviderId: t.Optional(t.String()),
        reason: t.String({ minLength: 10 }),
        durationSeconds: t.Optional(t.Number()),
        scopes: t.Optional(t.Array(t.String())),
      }),
      detail: {
        summary: 'Create delegated on-behalf-of access session',
        tags: ['Admin', 'Delegated Access'],
      },
    },
  );
