import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc, asc, ilike, or, type SQL } from 'drizzle-orm';

export const imagingController = new Elysia({ prefix: '/imaging' })
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
            ilike(schema.imagingOrders.type, `%${search}%`)
          )
        );
      }

      const orderColumn = (schema.imagingOrders as any)[sortBy] || schema.imagingOrders.createdAt;
      const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

      return await db
        .select({
          imagingOrder: schema.imagingOrders,
          patient: schema.patients,
        })
        .from(schema.imagingOrders)
        .innerJoin(
          schema.patients,
          eq(schema.imagingOrders.patientId, schema.patients.id),
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
      detail: { summary: 'List Imaging Orders', tags: ['Orders'] },
    },
  )
  .post(
    '',
    async ({ body, user }) => {
      const [order] = await db
        .insert(schema.imagingOrders)
        .values({
          ...body,
          organizationId: user.organizationId!,
          updatedAt: new Date(),
        })
        .returning();
      return order;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      body: t.Object({
        patientId: t.String(),
        providerId: t.String(),
        type: t.String(),
        notes: t.Optional(t.String()),
      }),
      detail: { summary: 'Create Imaging Order', tags: ['Orders'] },
    },
  )
  .patch(
    '/:id',
    async ({ params: { id }, body }) => {
      const [item] = await db
        .update(schema.imagingOrders)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(schema.imagingOrders.id, id))
        .returning();
      return item;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    },
  );
