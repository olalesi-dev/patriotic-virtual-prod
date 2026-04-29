import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc, sql, or, asc, ilike, type SQL } from 'drizzle-orm';

export const facilitiesController = new Elysia({ prefix: '/facilities' })
  .use(authMacro)
  .group('', { isSignIn: true }, (app) =>
    app
      .get(
        '',
        async ({ query, user }) => {
          const {
            search,
            limit = 20,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = 'desc',
          } = query;

          let whereClause: SQL | undefined = eq(
            schema.facilities.organizationId,
            user.organizationId!,
          );

          if (search) {
            whereClause = and(
              whereClause,
              or(
                ilike(schema.facilities.name, `%${search}%`),
                ilike(schema.facilities.type, `%${search}%`),
                ilike(schema.facilities.city, `%${search}%`),
              ),
            );
          }

          const orderColumn =
            (schema.facilities as any)[sortBy] || schema.facilities.createdAt;
          const orderDirection =
            sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

          return await db
            .select()
            .from(schema.facilities)
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
          detail: { summary: 'List Facilities', tags: ['CRM'] },
        },
      )
      .post(
        '/',
        async ({ body, user }) => {
          const [item] = await db
            .insert(schema.facilities)
            .values({
              ...body,
              organizationId: user.organizationId!,
              updatedAt: new Date(),
            })
            .returning();
          return item;
        },
        {
          body: t.Object({
            name: t.String(),
            type: t.String(),
            address: t.Optional(t.String()),
            city: t.Optional(t.String()),
            state: t.Optional(t.String()),
            zipCode: t.Optional(t.String()),
            phone: t.Optional(t.String()),
          }),
          detail: { summary: 'Create Facility', tags: ['CRM'] },
        },
      ),
  );
