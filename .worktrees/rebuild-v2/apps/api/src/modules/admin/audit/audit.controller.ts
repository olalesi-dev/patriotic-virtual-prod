import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import {
  eq,
  and,
  desc,
  asc,
  sql,
  ilike,
  or,
  gte,
  lte,
  type SQL,
} from 'drizzle-orm';
import {
  buildPaginationMeta,
  normalizePagination,
  normalizeSortOrder,
  parseBooleanFilter,
  parseDateFilter,
} from '../query-utils';
import {
  buildAuditCsv,
  buildAuditExportRows,
  normalizeAuditExportFormat,
} from './audit-export';

const auditSortKeys = [
  'createdAt',
  'actorName',
  'actorRole',
  'action',
  'resourceType',
  'exportStatus',
  'isPhiAccess',
] as const;

type AuditSortKey = (typeof auditSortKeys)[number];

const normalizeAuditSortBy = (sortBy?: string): AuditSortKey =>
  auditSortKeys.includes(sortBy as AuditSortKey)
    ? (sortBy as AuditSortKey)
    : 'createdAt';

const buildAuditWhereClause = (
  query: Record<string, unknown>,
  organizationId: string,
) => {
  const isPhiAccess = parseBooleanFilter(query.isPhiAccess);
  const createdFrom = parseDateFilter(query.createdFrom);
  const createdTo = parseDateFilter(query.createdTo);
  const conditions: SQL[] = [
    eq(schema.auditLogs.organizationId, organizationId),
  ];

  if (typeof query.search === 'string' && query.search.trim()) {
    const search = query.search.trim();
    const searchCondition = or(
      ilike(schema.auditLogs.summary, `%${search}%`),
      ilike(schema.auditLogs.actorName, `%${search}%`),
      ilike(schema.auditLogs.recordId, `%${search}%`),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }
  if (typeof query.actorId === 'string' && query.actorId.trim()) {
    conditions.push(eq(schema.auditLogs.actorId, query.actorId.trim()));
  }
  if (typeof query.actorRole === 'string' && query.actorRole.trim()) {
    conditions.push(eq(schema.auditLogs.actorRole, query.actorRole.trim()));
  }
  if (typeof query.action === 'string' && query.action.trim()) {
    conditions.push(eq(schema.auditLogs.action, query.action.trim()));
  }
  if (typeof query.resourceType === 'string' && query.resourceType.trim()) {
    conditions.push(eq(schema.auditLogs.tableName, query.resourceType.trim()));
  }
  if (typeof query.resourceId === 'string' && query.resourceId.trim()) {
    conditions.push(eq(schema.auditLogs.recordId, query.resourceId.trim()));
  }
  if (typeof query.exportStatus === 'string' && query.exportStatus.trim()) {
    conditions.push(
      eq(schema.auditLogs.exportStatus, query.exportStatus.trim()),
    );
  }
  if (isPhiAccess !== undefined) {
    conditions.push(eq(schema.auditLogs.isPhiAccess, isPhiAccess));
  }
  if (createdFrom) {
    conditions.push(gte(schema.auditLogs.createdAt, createdFrom));
  }
  if (createdTo) {
    conditions.push(lte(schema.auditLogs.createdAt, createdTo));
  }

  return {
    whereClause: and(...conditions),
    filters: {
      search: query.search,
      actorId: query.actorId,
      actorRole: query.actorRole,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      exportStatus: query.exportStatus,
      isPhiAccess,
      createdFrom: createdFrom?.toISOString(),
      createdTo: createdTo?.toISOString(),
    },
  };
};

const auditSortColumns = {
  createdAt: schema.auditLogs.createdAt,
  actorName: schema.auditLogs.actorName,
  actorRole: schema.auditLogs.actorRole,
  action: schema.auditLogs.action,
  resourceType: schema.auditLogs.tableName,
  exportStatus: schema.auditLogs.exportStatus,
  isPhiAccess: schema.auditLogs.isPhiAccess,
};

export const auditController = new Elysia({ prefix: '/audit' })
  .use(authMacro)
  .get(
    '/',
    async ({ query, user }) => {
      const { limit, offset } = normalizePagination(query, {
        defaultLimit: 50,
        maxLimit: 250,
      });
      const sortBy = normalizeAuditSortBy(query.sortBy);
      const sortOrder = normalizeSortOrder(query.sortOrder);
      const { whereClause, filters } = buildAuditWhereClause(
        query,
        user.organizationId!,
      );
      const orderColumn = auditSortColumns[sortBy];

      const payload = await db
        .select()
        .from(schema.auditLogs)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.auditLogs)
        .where(whereClause);
      const total = Number(countResult?.count ?? 0);

      return {
        payload,
        pagination: buildPaginationMeta({ total, limit, offset }),
        sort: { sortBy, sortOrder },
        filters,
      };
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:audit:read'],
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
        actorId: t.Optional(t.String()),
        actorRole: t.Optional(t.String()),
        action: t.Optional(t.String()),
        resourceType: t.Optional(t.String()),
        resourceId: t.Optional(t.String()),
        exportStatus: t.Optional(t.String()),
        isPhiAccess: t.Optional(t.String()),
        createdFrom: t.Optional(t.String()),
        createdTo: t.Optional(t.String()),
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
      detail: { summary: 'List Audit Logs', tags: ['Admin'] },
    },
  )
  .get(
    '/export',
    async ({ query, user }) => {
      const { limit, offset } = normalizePagination(query, {
        defaultLimit: 1000,
        maxLimit: 10_000,
      });
      const sortBy = normalizeAuditSortBy(query.sortBy);
      const sortOrder = normalizeSortOrder(query.sortOrder);
      const format = normalizeAuditExportFormat(query.format);
      const { whereClause, filters } = buildAuditWhereClause(
        query,
        user.organizationId!,
      );
      const orderColumn = auditSortColumns[sortBy];
      const logs = await db
        .select()
        .from(schema.auditLogs)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));

      const exportedAt = new Date().toISOString();
      if (format === 'json') {
        return Response.json(
          {
            exportedAt,
            filters,
            sort: { sortBy, sortOrder },
            payload: buildAuditExportRows(logs),
          },
          {
            headers: {
              'content-disposition': `attachment; filename="audit-logs-${exportedAt}.json"`,
            },
          },
        );
      }

      return new Response(buildAuditCsv(logs), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="audit-logs-${exportedAt}.csv"`,
        },
      });
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:audit:read'],
      transform({ query }) {
        if (query.limit) {
          query.limit = Number(query.limit);
        }
        if (query.offset) {
          query.offset = Number(query.offset);
        }
      },
      query: t.Object({
        format: t.Optional(t.Union([t.Literal('csv'), t.Literal('json')])),
        search: t.Optional(t.String()),
        actorId: t.Optional(t.String()),
        actorRole: t.Optional(t.String()),
        action: t.Optional(t.String()),
        resourceType: t.Optional(t.String()),
        resourceId: t.Optional(t.String()),
        exportStatus: t.Optional(t.String()),
        isPhiAccess: t.Optional(t.String()),
        createdFrom: t.Optional(t.String()),
        createdTo: t.Optional(t.String()),
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
      detail: { summary: 'Export Audit Logs', tags: ['Admin'] },
    },
  );
