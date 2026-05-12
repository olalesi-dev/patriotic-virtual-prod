import { Elysia, t } from 'elysia';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import * as authSchema from '@workspace/db/auth-schema';
import * as schema from '@workspace/db/schema';
import { db } from '../../../db';
import { authMacro } from '../../auth/macro';
import {
  buildPaginationMeta,
  normalizePagination,
  normalizeSortOrder,
  parseBooleanFilter,
  parseDateFilter,
} from '../query-utils';
import { normalizeAdminSessionSortBy } from './sessions-query';

const sessionSortColumns = {
  loggedInAt: authSchema.sessions.createdAt,
  lastActivityAt: authSchema.sessions.lastActivityAt,
  expiresAt: authSchema.sessions.expiresAt,
  name: schema.users.name,
  email: schema.users.email,
  role: authSchema.sessions.role,
  loginMethod: authSchema.sessions.loginMethod,
};

export const sessionsController = new Elysia({ prefix: '/sessions' })
  .use(authMacro)
  .get(
    '/',
    async ({ query, user }) => {
      const { limit, offset } = normalizePagination(query, {
        defaultLimit: 50,
        maxLimit: 250,
      });
      const sortBy = normalizeAdminSessionSortBy(query.sortBy);
      const sortOrder = normalizeSortOrder(query.sortOrder);
      const active = parseBooleanFilter(query.active);
      const loginFrom = parseDateFilter(query.loginFrom);
      const loginTo = parseDateFilter(query.loginTo);

      const conditions: SQL[] = [
        eq(schema.users.organizationId, user.organizationId!),
      ];

      if (query.userId) {
        conditions.push(eq(authSchema.sessions.userId, query.userId));
      }
      if (query.role) {
        conditions.push(eq(authSchema.sessions.role, query.role));
      }
      if (query.loginMethod) {
        conditions.push(eq(authSchema.sessions.loginMethod, query.loginMethod));
      }
      if (query.search) {
        const searchCondition = or(
          ilike(schema.users.name, `%${query.search}%`),
          ilike(schema.users.email, `%${query.search}%`),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
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
      const orderColumn = sessionSortColumns[sortBy];
      const payload = await db
        .select({
          id: authSchema.sessions.id,
          userId: authSchema.sessions.userId,
          userName: schema.users.name,
          userEmail: schema.users.email,
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
        .innerJoin(
          schema.users,
          eq(authSchema.sessions.userId, schema.users.id),
        )
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(authSchema.sessions)
        .innerJoin(
          schema.users,
          eq(authSchema.sessions.userId, schema.users.id),
        )
        .where(whereClause);
      const total = Number(countResult?.count ?? 0);

      return {
        payload,
        pagination: buildPaginationMeta({ total, limit, offset }),
        sort: { sortBy, sortOrder },
        filters: {
          search: query.search,
          userId: query.userId,
          role: query.role,
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
        userId: t.Optional(t.String()),
        role: t.Optional(t.String()),
        loginMethod: t.Optional(t.String()),
        active: t.Optional(t.String()),
        loginFrom: t.Optional(t.String()),
        loginTo: t.Optional(t.String()),
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
      detail: { summary: 'List User Sessions', tags: ['Admin'] },
    },
  );
