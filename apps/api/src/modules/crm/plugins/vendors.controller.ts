import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc, sql, or, asc, ilike, type SQL } from 'drizzle-orm';

export const vendorsController = new Elysia({ prefix: '/vendors' })
  .use(authMacro)
  .group('', { isSignIn: true }, (app) =>
    app
      .get(
        '/',
        async ({ query, user }) => {
          const {
            search,
            limit = '20',
            offset = '0',
            sortBy = 'createdAt',
            sortOrder = 'desc',
          } = query;

          let whereClause: SQL | undefined = eq(
            schema.vendors.organizationId,
            user.organizationId!,
          );

          if (search) {
            whereClause = and(
              whereClause,
              or(
                ilike(schema.vendors.name, `%${search}%`),
                ilike(schema.vendors.category, `%${search}%`),
                ilike(schema.vendors.contactName, `%${search}%`),
              ),
            );
          }

          const orderColumn =
            (schema.vendors as any)[sortBy] || schema.vendors.createdAt;
          const orderDirection =
            sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

          return await db
            .select()
            .from(schema.vendors)
            .where(whereClause)
            .limit(Number(limit))
            .offset(Number(offset))
            .orderBy(orderDirection);
        },
        {
          query: t.Object({
            search: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            offset: t.Optional(t.String()),
            sortBy: t.Optional(t.String()),
            sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
          }),
          detail: { summary: 'List Vendors', tags: ['CRM'] },
        },
      )
      .post(
        '/',
        async ({ body, user }) => {
          const [item] = await db
            .insert(schema.vendors)
            .values({
              ...body,
              contractEndDate: body.contractEndDate
                ? new Date(body.contractEndDate)
                : undefined,
              organizationId: user.organizationId!,
              updatedAt: new Date(),
            })
            .returning();
          return item;
        },
        {
          body: t.Object({
            name: t.String(),
            contactName: t.Optional(t.String()),
            email: t.Optional(t.String()),
            phone: t.Optional(t.String()),
            category: t.Optional(t.String()),
            contractEndDate: t.Optional(t.String()),
          }),
          detail: { summary: 'Create Vendor', tags: ['CRM'] },
        },
      ),
  );
