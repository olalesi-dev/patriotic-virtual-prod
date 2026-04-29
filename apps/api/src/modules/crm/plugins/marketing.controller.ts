import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc, sql, or, asc, ilike, type SQL } from 'drizzle-orm';

export const marketingController = new Elysia()
  .use(authMacro)
  .group('', { isSignIn: true }, (app) =>
    app
      // Campaigns
      .get(
        '/campaigns',
        async ({ query, user }) => {
          const {
            search,
            limit = '20',
            offset = '0',
            sortBy = 'createdAt',
            sortOrder = 'desc',
          } = query;

          let whereClause: SQL | undefined = eq(
            schema.campaigns.organizationId,
            user.organizationId!,
          );

          if (search) {
            whereClause = and(
              whereClause,
              or(
                ilike(schema.campaigns.name, `%${search}%`),
                ilike(schema.campaigns.type, `%${search}%`),
              ),
            );
          }

          const orderColumn =
            (schema.campaigns as any)[sortBy] || schema.campaigns.createdAt;
          const orderDirection =
            sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

          return await db
            .select()
            .from(schema.campaigns)
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
          detail: { summary: 'List Campaigns', tags: ['CRM'] },
        },
      )
      .post(
        '/campaigns',
        async ({ body, user }) => {
          const [item] = await db
            .insert(schema.campaigns)
            .values({
              ...body,
              startDate: body.startDate ? new Date(body.startDate) : undefined,
              endDate: body.endDate ? new Date(body.endDate) : undefined,
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
            status: t.Optional(t.String()),
            startDate: t.Optional(t.String()),
            endDate: t.Optional(t.String()),
            budget: t.Optional(t.Number()),
          }),
          detail: { summary: 'Create Campaign', tags: ['CRM'] },
        },
      )

      // Grant Proposals
      .get(
        '/grants',
        async ({ query, user }) => {
          const {
            search,
            limit = '20',
            offset = '0',
            sortBy = 'createdAt',
            sortOrder = 'desc',
          } = query;

          let whereClause: SQL | undefined = eq(
            schema.grantProposals.organizationId,
            user.organizationId!,
          );

          if (search) {
            whereClause = and(
              whereClause,
              or(
                ilike(schema.grantProposals.title, `%${search}%`),
                ilike(schema.grantProposals.agency, `%${search}%`),
              ),
            );
          }

          const orderColumn =
            (schema.grantProposals as any)[sortBy] ||
            schema.grantProposals.createdAt;
          const orderDirection =
            sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

          return await db
            .select()
            .from(schema.grantProposals)
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
          detail: { summary: 'List Grants', tags: ['CRM'] },
        },
      )
      .post(
        '/grants',
        async ({ body, user }) => {
          const [item] = await db
            .insert(schema.grantProposals)
            .values({
              ...body,
              deadline: body.deadline ? new Date(body.deadline) : undefined,
              organizationId: user.organizationId!,
              updatedAt: new Date(),
            })
            .returning();
          return item;
        },
        {
          body: t.Object({
            title: t.String(),
            agency: t.String(),
            amount: t.Optional(t.Number()),
            status: t.Optional(t.String()),
            deadline: t.Optional(t.String()),
          }),
          detail: { summary: 'Create Grant', tags: ['CRM'] },
        },
      ),
  );
