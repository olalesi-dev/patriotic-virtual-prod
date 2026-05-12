import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import * as authSchema from '@workspace/db/auth-schema';
import {
  revokeUserAuth,
  revokeUserSessions,
} from '@workspace/auth/session-security';
import {
  eq,
  and,
  ilike,
  or,
  desc,
  asc,
  gte,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import { logAuthSecurityEvent } from '../../auth/security-audit';
import {
  buildPaginationMeta,
  normalizePagination,
  normalizeSortOrder,
  parseBooleanFilter,
  parseDateFilter,
} from '../query-utils';
import { normalizeUserSortBy } from './users-query';

const findUserInOrganization = async (id: string, organizationId: string) => {
  const [target] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, id),
        eq(schema.users.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!target) {
    throw new Error('User not found or unauthorized');
  }
  return target;
};

export const usersController = new Elysia({ prefix: '/users' })
  .use(authMacro)
  .get(
    '/',
    async ({ query, user }) => {
      const { limit, offset } = normalizePagination(query);
      const sortBy = normalizeUserSortBy(query.sortBy);
      const sortOrder = normalizeSortOrder(query.sortOrder);
      const disabled = parseBooleanFilter(query.disabled);
      const emailVerified = parseBooleanFilter(query.emailVerified);
      const mfaEnabled = parseBooleanFilter(query.mfaEnabled);
      const mustChangePassword = parseBooleanFilter(query.mustChangePassword);
      const createdFrom = parseDateFilter(query.createdFrom);
      const createdTo = parseDateFilter(query.createdTo);

      const conditions: SQL[] = [
        eq(schema.users.organizationId, user.organizationId!),
      ];

      if (query.search) {
        const searchCondition = or(
          ilike(schema.users.name, `%${query.search}%`),
          ilike(schema.users.email, `%${query.search}%`),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }
      if (query.role) {
        conditions.push(eq(schema.roles.name, query.role));
      }
      if (disabled !== undefined) {
        conditions.push(eq(schema.users.disabled, disabled));
      }
      if (emailVerified !== undefined) {
        conditions.push(eq(schema.users.emailVerified, emailVerified));
      }
      if (mfaEnabled !== undefined) {
        conditions.push(eq(schema.users.twoFactorEnabled, mfaEnabled));
      }
      if (mustChangePassword !== undefined) {
        conditions.push(
          eq(schema.users.mustChangePassword, mustChangePassword),
        );
      }
      if (createdFrom) {
        conditions.push(gte(schema.users.createdAt, createdFrom));
      }
      if (createdTo) {
        conditions.push(lte(schema.users.createdAt, createdTo));
      }

      const whereClause = and(...conditions);
      const sortColumns = {
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.roles.name,
        disabled: schema.users.disabled,
        emailVerified: schema.users.emailVerified,
      };
      const orderColumn = sortColumns[sortBy];
      const orderDirection =
        sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

      const payload = await db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          phone: schema.users.phone,
          role: schema.roles.name,
          createdAt: schema.users.createdAt,
          updatedAt: schema.users.updatedAt,
          emailVerified: schema.users.emailVerified,
          phoneVerified: schema.users.phoneVerified,
          twoFactorEnabled: schema.users.twoFactorEnabled,
          mustChangePassword: schema.users.mustChangePassword,
          lockedUntil: schema.users.lockedUntil,
          disabled: schema.users.disabled,
        })
        .from(schema.users)
        .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(orderDirection);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
        .where(whereClause);

      const total = Number(countResult?.count ?? 0);

      return {
        payload,
        pagination: buildPaginationMeta({ total, limit, offset }),
        sort: { sortBy, sortOrder },
        filters: {
          search: query.search,
          role: query.role,
          disabled,
          emailVerified,
          mfaEnabled,
          mustChangePassword,
          createdFrom: createdFrom?.toISOString(),
          createdTo: createdTo?.toISOString(),
        },
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:read'],
      transform({ query }) {
        if (query.limit) {
          query.limit = Number(query.limit);
        }
        if (query.offset) {
          query.offset = Number(query.offset);
        }
      },
      query: t.Object({
        search: t.Optional(t.String()),
        role: t.Optional(t.String()),
        disabled: t.Optional(t.String()),
        emailVerified: t.Optional(t.String()),
        mfaEnabled: t.Optional(t.String()),
        mustChangePassword: t.Optional(t.String()),
        createdFrom: t.Optional(t.String()),
        createdTo: t.Optional(t.String()),
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
      detail: { summary: 'List Users', tags: ['Admin'] },
    },
  )
  .get(
    '/:id',
    async ({ params: { id }, user }) => {
      const [target] = await db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          phone: schema.users.phone,
          role: schema.roles.name,
          createdAt: schema.users.createdAt,
          updatedAt: schema.users.updatedAt,
          emailVerified: schema.users.emailVerified,
          phoneVerified: schema.users.phoneVerified,
          twoFactorEnabled: schema.users.twoFactorEnabled,
          mustChangePassword: schema.users.mustChangePassword,
          disabled: schema.users.disabled,
          lockedUntil: schema.users.lockedUntil,
          lastFailedLoginAt: schema.users.lastFailedLoginAt,
        })
        .from(schema.users)
        .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
        .where(
          and(
            eq(schema.users.id, id),
            eq(schema.users.organizationId, user.organizationId!),
          ),
        )
        .limit(1);

      if (!target) {
        throw new Error('User not found or unauthorized');
      }

      const [sessionStats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${authSchema.sessions.expiresAt} > now())::int`,
          lastLoginAt: sql<Date | null>`max(${authSchema.sessions.createdAt})`,
        })
        .from(authSchema.sessions)
        .where(eq(authSchema.sessions.userId, id));

      return {
        ...target,
        sessions: {
          total: Number(sessionStats?.total ?? 0),
          active: Number(sessionStats?.active ?? 0),
          lastLoginAt: sessionStats?.lastLoginAt,
        },
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Get User Details', tags: ['Admin'] },
    },
  )
  .get(
    '/:id/sessions',
    async ({ params: { id }, query, user }) => {
      await findUserInOrganization(id, user.organizationId!);
      const { limit, offset } = normalizePagination(query);
      const active = parseBooleanFilter(query.active);
      const loginFrom = parseDateFilter(query.loginFrom);
      const loginTo = parseDateFilter(query.loginTo);

      const conditions: SQL[] = [eq(authSchema.sessions.userId, id)];
      if (query.loginMethod) {
        conditions.push(eq(authSchema.sessions.loginMethod, query.loginMethod));
      }
      if (active === true) {
        conditions.push(sql`${authSchema.sessions.expiresAt} > now()`);
      }
      if (active === false) {
        conditions.push(sql`${authSchema.sessions.expiresAt} <= now()`);
      }
      if (loginFrom) {
        conditions.push(gte(authSchema.sessions.createdAt, loginFrom));
      }
      if (loginTo) {
        conditions.push(lte(authSchema.sessions.createdAt, loginTo));
      }

      const whereClause = and(...conditions);
      const payload = await db
        .select({
          id: authSchema.sessions.id,
          userId: authSchema.sessions.userId,
          role: authSchema.sessions.role,
          loginMethod: authSchema.sessions.loginMethod,
          loggedInAt: authSchema.sessions.createdAt,
          lastActivityAt: authSchema.sessions.lastActivityAt,
          expiresAt: authSchema.sessions.expiresAt,
          ipAddress: authSchema.sessions.ipAddress,
          userAgent: authSchema.sessions.userAgent,
          active: sql<boolean>`${authSchema.sessions.expiresAt} > now()`,
        })
        .from(authSchema.sessions)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(authSchema.sessions.createdAt));

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(authSchema.sessions)
        .where(whereClause);
      const total = Number(countResult?.count ?? 0);

      return {
        payload,
        pagination: buildPaginationMeta({ total, limit, offset }),
        sort: { sortBy: 'loggedInAt', sortOrder: 'desc' },
        filters: {
          loginMethod: query.loginMethod,
          active,
          loginFrom: loginFrom?.toISOString(),
          loginTo: loginTo?.toISOString(),
        },
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:sessions:read'],
      params: t.Object({ id: t.String() }),
      transform({ query }) {
        if (query.limit) {
          query.limit = Number(query.limit);
        }
        if (query.offset) {
          query.offset = Number(query.offset);
        }
      },
      query: t.Object({
        loginMethod: t.Optional(t.String()),
        active: t.Optional(t.String()),
        loginFrom: t.Optional(t.String()),
        loginTo: t.Optional(t.String()),
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
      }),
      detail: { summary: 'List User Sessions', tags: ['Admin'] },
    },
  )
  .patch(
    '/:id',
    async ({ params: { id }, body, user, session, request, ip }) => {
      const [before] = await db
        .select({
          roleId: schema.users.roleId,
        })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.id, id),
            eq(schema.users.organizationId, user.organizationId!),
          ),
        )
        .limit(1);

      const [updated] = await db
        .update(schema.users)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.users.id, id),
            eq(schema.users.organizationId, user.organizationId!),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error('User not found or unauthorized');
      }

      if (body.roleId && before?.roleId !== body.roleId) {
        const revocation = await revokeUserAuth(db as never, id, 'role_change');
        await logAuthSecurityEvent({
          actor: user,
          actorRole: session.role,
          targetUserId: id,
          event: 'role_change',
          request,
          ipAddress: ip,
          details: {
            previousRoleId: before?.roleId,
            nextRoleId: body.roleId,
            tokenVersion: revocation.tokenVersion,
          },
        });
      }

      return updated;
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:write'],
      requireStepUp: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        roleId: t.Optional(t.String()),
      }),
      detail: { summary: 'Update User', tags: ['Admin'] },
    },
  )
  .post(
    '/:id/revoke-sessions',
    async ({ params: { id }, user, session, request, ip }) => {
      await findUserInOrganization(id, user.organizationId!);

      const revocation = await revokeUserAuth(
        db as never,
        id,
        'manual_admin_action',
      );
      await logAuthSecurityEvent({
        actor: user,
        actorRole: session.role,
        targetUserId: id,
        event: 'manual_admin_action',
        request,
        ipAddress: ip,
        details: {
          securityAction: 'revoke_sessions',
          tokenVersion: revocation.tokenVersion,
        },
      });

      return revocation;
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:write'],
      requireStepUp: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Revoke User Sessions', tags: ['Admin'] },
    },
  )
  .post(
    '/:id/disable',
    async ({ params: { id }, body, user, session, request, ip }) => {
      await findUserInOrganization(id, user.organizationId!);

      const [updated] = await db
        .update(schema.users)
        .set({
          disabled: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id))
        .returning();

      const revocation = await revokeUserAuth(
        db as never,
        id,
        body.reason === 'suspected_compromise'
          ? 'suspected_compromise'
          : 'account_disabled',
      );
      await logAuthSecurityEvent({
        actor: user,
        actorRole: session.role,
        targetUserId: id,
        event:
          body.reason === 'suspected_compromise'
            ? 'suspected_compromise'
            : 'account_disabled',
        request,
        ipAddress: ip,
        details: {
          tokenVersion: revocation.tokenVersion,
        },
      });

      return { user: updated, revocation };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:write'],
      requireStepUp: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        reason: t.Optional(
          t.Union([
            t.Literal('account_disabled'),
            t.Literal('suspected_compromise'),
          ]),
        ),
      }),
      detail: { summary: 'Disable User Account', tags: ['Admin'] },
    },
  )
  .post(
    '/:id/enable',
    async ({ params: { id }, user, session, request, ip }) => {
      await findUserInOrganization(id, user.organizationId!);

      const [updated] = await db
        .update(schema.users)
        .set({
          disabled: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id))
        .returning();
      await logAuthSecurityEvent({
        actor: user,
        actorRole: session.role,
        targetUserId: id,
        event: 'account_enabled',
        request,
        ipAddress: ip,
      });

      return { user: updated };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:write'],
      requireStepUp: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Enable User Account', tags: ['Admin'] },
    },
  )
  .post(
    '/:id/mfa/reset',
    async ({ params: { id }, user, session, request, ip }) => {
      await findUserInOrganization(id, user.organizationId!);

      await db
        .delete(authSchema.twoFactors)
        .where(eq(authSchema.twoFactors.userId, id));
      await db
        .update(schema.users)
        .set({
          twoFactorEnabled: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id));

      const revocation = await revokeUserAuth(db as never, id, 'mfa_reset');
      await logAuthSecurityEvent({
        actor: user,
        actorRole: session.role,
        targetUserId: id,
        event: 'mfa_reset',
        request,
        ipAddress: ip,
        details: {
          tokenVersion: revocation.tokenVersion,
        },
      });

      return { success: true, revocation };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:write'],
      requireStepUp: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Reset User MFA', tags: ['Admin'] },
    },
  )
  .delete(
    '/:id',
    async ({ params: { id }, user, session, request, ip }) => {
      await revokeUserSessions(db as never, id);
      await logAuthSecurityEvent({
        actor: user,
        actorRole: session.role,
        targetUserId: id,
        event: 'manual_admin_action',
        request,
        ipAddress: ip,
        details: {
          securityAction: 'delete_user_revoke_sessions',
        },
      });
      await db
        .delete(schema.users)
        .where(
          and(
            eq(schema.users.id, id),
            eq(schema.users.organizationId, user.organizationId!),
          ),
        );
      return { success: true };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:users:write'],
      requireStepUp: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Delete User', tags: ['Admin'] },
    },
  );
