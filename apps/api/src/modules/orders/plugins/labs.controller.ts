import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc, asc, ilike, or, type SQL } from 'drizzle-orm';

export const labsController = new Elysia({ prefix: '/labs' })
  .use(authMacro)
  .get(
    '',
    async ({ query, user }) => {
      const { 
        search, 
        limit = '20', 
        offset = '0',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      let whereClause: SQL | undefined = eq(schema.patients.organizationId, user.organizationId!);

      if (search) {
        whereClause = and(
          whereClause,
          or(
            ilike(schema.patients.firstName, `%${search}%`),
            ilike(schema.patients.lastName, `%${search}%`),
            ilike(schema.labOrders.testName, `%${search}%`)
          )
        );
      }

      const orderColumn = (schema.labOrders as any)[sortBy] || schema.labOrders.createdAt;
      const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

      return await db
        .select({
          labOrder: schema.labOrders,
          patient: schema.patients,
        })
        .from(schema.labOrders)
        .innerJoin(
          schema.patients,
          eq(schema.labOrders.patientId, schema.patients.id),
        )
        .where(whereClause)
        .limit(Number(limit))
        .offset(Number(offset))
        .orderBy(orderDirection);
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
      detail: { summary: 'List Lab Orders', tags: ['Orders'] },
    },
  )
  .post(
    '',
    async ({ body }) => {
      const [item] = await db
        .insert(schema.labOrders)
        .values({ ...body, updatedAt: new Date() })
        .returning();
      return item;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      body: t.Object({
        patientId: t.String(),
        providerId: t.String(),
        testName: t.String(),
        status: t.Optional(t.String()),
      }),
    },
  )
  .patch(
    '/:id',
    async ({ params: { id }, body }) => {
      const [item] = await db
        .update(schema.labOrders)
        .set({
          ...body,
          completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(schema.labOrders.id, id))
        .returning();
      return item;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Optional(t.String()),
        completedAt: t.Optional(t.String()),
      }),
    },
  );
