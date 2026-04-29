import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc, asc, ilike, or, type SQL } from 'drizzle-orm';

export const prescriptionsController = new Elysia({ prefix: '/prescriptions' })
  .use(authMacro)
  .get(
    '',
    async ({ query, user }) => {
      const { 
        search, 
        limit = 20, 
        offset = 0,
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
            ilike(schema.prescriptions.medicationName, `%${search}%`)
          )
        );
      }

      const orderColumn = (schema.prescriptions as any)[sortBy] || schema.prescriptions.createdAt;
      const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

      return await db
        .select({
          prescription: schema.prescriptions,
          patient: schema.patients,
        })
        .from(schema.prescriptions)
        .innerJoin(
          schema.patients,
          eq(schema.prescriptions.patientId, schema.patients.id),
        )
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(orderDirection);
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
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
      detail: { summary: 'List Prescriptions', tags: ['Orders'] },
    },
  )
  .patch(
    '/:id',
    async ({ params: { id }, body }) => {
      const [item] = await db
        .update(schema.prescriptions)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(schema.prescriptions.id, id))
        .returning();
      return item;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({ status: t.Optional(t.String()) }),
    },
  );
