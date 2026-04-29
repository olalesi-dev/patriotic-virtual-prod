import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc, sql, or, asc, ilike, type SQL } from 'drizzle-orm';

export const operationsController = new Elysia()
  .use(authMacro)
  .group('', { isSignIn: true }, (app) =>
    app
      // Time Sheets
      .get(
        '/timesheets',
        async ({ query, user }) => {
          const {
            limit = 20,
            offset = 0,
            sortBy = 'date',
            sortOrder = 'desc',
          } = query;

          const orderColumn =
            (schema.timeSheets as any)[sortBy] || schema.timeSheets.date;
          const orderDirection =
            sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

          return await db
            .select({
              timesheet: schema.timeSheets,
              user: { id: schema.users.id, name: schema.users.name },
            })
            .from(schema.timeSheets)
            .innerJoin(schema.users, eq(schema.timeSheets.userId, schema.users.id))
            .where(eq(schema.timeSheets.organizationId, user.organizationId!))
            .limit(limit)
            .offset(offset)
            .orderBy(orderDirection);
        },
        {
          transform({ query }) {
            if (query.limit) query.limit = +query.limit;
            if (query.offset) query.offset = +query.offset;
          },
          query: t.Object({
            limit: t.Optional(t.Numeric()),
            offset: t.Optional(t.Numeric()),
            sortBy: t.Optional(t.String()),
            sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
          }),
          detail: { summary: 'List Time Sheets', tags: ['CRM'] },
        },
      )
      .post(
        '/timesheets',
        async ({ body, user }) => {
          const [item] = await db
            .insert(schema.timeSheets)
            .values({
              ...body,
              date: new Date(body.date),
              userId: user.id,
              organizationId: user.organizationId!,
              updatedAt: new Date(),
            })
            .returning();
          return item;
        },
        {
          body: t.Object({
            date: t.String(),
            hours: t.Number(),
            description: t.Optional(t.String()),
          }),
          detail: { summary: 'Create Time Sheet', tags: ['CRM'] },
        },
      )

      // Compliance Documents
      .get(
        '/compliance',
        async ({ query, user }) => {
          const {
            search,
            limit = 20,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = 'desc',
          } = query;

          let whereClause: SQL | undefined = eq(
            schema.complianceDocuments.organizationId,
            user.organizationId!,
          );

          if (search) {
            whereClause = and(
              whereClause,
              or(
                ilike(schema.complianceDocuments.title, `%${search}%`),
                ilike(schema.complianceDocuments.category, `%${search}%`),
              ),
            );
          }

          const orderColumn =
            (schema.complianceDocuments as any)[sortBy] ||
            schema.complianceDocuments.createdAt;
          const orderDirection =
            sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

          return await db
            .select()
            .from(schema.complianceDocuments)
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderDirection);
        },
        {
          transform({ query }) {
            if (query.limit) query.limit = +query.limit;
            if (query.offset) query.offset = +query.offset;
          },
          query: t.Object({
            search: t.Optional(t.String()),
            limit: t.Optional(t.Numeric()),
            offset: t.Optional(t.Numeric()),
            sortBy: t.Optional(t.String()),
            sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
          }),
          detail: { summary: 'List Compliance Documents', tags: ['CRM'] },
        },
      )
      .post(
        '/compliance',
        async ({ body, user }) => {
          const [item] = await db
            .insert(schema.complianceDocuments)
            .values({
              ...body,
              effectiveDate: body.effectiveDate
                ? new Date(body.effectiveDate)
                : undefined,
              expirationDate: body.expirationDate
                ? new Date(body.expirationDate)
                : undefined,
              organizationId: user.organizationId!,
              updatedAt: new Date(),
            })
            .returning();
          return item;
        },
        {
          body: t.Object({
            title: t.String(),
            category: t.String(),
            status: t.Optional(t.String()),
            effectiveDate: t.Optional(t.String()),
            expirationDate: t.Optional(t.String()),
            version: t.Optional(t.String()),
            summary: t.Optional(t.String()),
          }),
          detail: { summary: 'Create Compliance Document', tags: ['CRM'] },
        },
      ),
  );
