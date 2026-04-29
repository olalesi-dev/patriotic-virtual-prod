import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, or, ilike, desc, asc, type SQL } from 'drizzle-orm';

export const patientsController = new Elysia({ prefix: '/patients' })
  .use(authMacro)
  .get(
    '/',
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
            ilike(schema.patients.email, `%${search}%`)
          )
        );
      }

      const orderColumn = (schema.patients as any)[sortBy] || schema.patients.createdAt;
      const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

      const items = await db
        .select()
        .from(schema.patients)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(orderDirection);

      return items;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      query: t.Object({
        search: t.Optional(t.String({ description: 'Search term for first name, last name, or email' })),
        limit: t.Optional(t.Numeric({ description: 'Number of records to return (default: 20)' })),
        offset: t.Optional(t.Numeric({ description: 'Number of records to skip (default: 0)' })),
        sortBy: t.Optional(t.String({ description: 'Column to sort by (e.g., firstName, createdAt)' })),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')], { description: 'Sort direction' })),
      }),
      transform({ query }) {
        if (query.limit) query.limit = +query.limit;
        if (query.offset) query.offset = +query.offset;
      },
      detail: { summary: 'List Patients', tags: ['Clinical'] },
    }
  )
  .get(
    '/:id',
    async ({ params: { id }, user }) => {
      const [patient] = await db
        .select()
        .from(schema.patients)
        .where(
          and(
            eq(schema.patients.id, id),
            eq(schema.patients.organizationId, user.organizationId!)
          )
        )
        .limit(1);

      if (!patient) throw new Error('Patient not found');
      return patient;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      params: t.Object({ id: t.String() }),
      detail: { summary: 'Get Patient Details', tags: ['Clinical'] },
    }
  )
  .post(
    '/',
    async ({ body, user }) => {
      const [patient] = await db
        .insert(schema.patients)
        .values({
          ...body,
          organizationId: user.organizationId!,
          updatedAt: new Date(),
        })
        .returning();
      return patient;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      body: t.Object({
        firstName: t.String({ description: 'Legal first name' }),
        lastName: t.String({ description: 'Legal last name' }),
        dateOfBirth: t.Optional(t.String({ description: 'Format: YYYY-MM-DD' })),
        gender: t.Optional(t.String({ description: 'Male, Female, or Unknown' })),
        email: t.Optional(t.String({ format: 'email' })),
        phone: t.Optional(t.String({ description: 'Mobile or landline number' })),
        address1: t.Optional(t.String()),
        city: t.Optional(t.String()),
        state: t.Optional(t.String()),
        zipCode: t.Optional(t.String()),
      }),
      detail: { summary: 'Create Patient', tags: ['Clinical'] },
    }
  )
  .patch(
    '/:id',
    async ({ params: { id }, body, user }) => {
      const [patient] = await db
        .update(schema.patients)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.patients.id, id),
            eq(schema.patients.organizationId, user.organizationId!)
          )
        )
        .returning();
      
      if (!patient) throw new Error('Patient not found or unauthorized');
      return patient;
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:write'],
      params: t.Object({ id: t.String() }),
      body: t.Object({
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        dateOfBirth: t.Optional(t.String()),
        gender: t.Optional(t.String()),
        email: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        address1: t.Optional(t.String()),
        city: t.Optional(t.String()),
        state: t.Optional(t.String()),
        zipCode: t.Optional(t.String()),
      }),
      detail: { summary: 'Update Patient', tags: ['Clinical'] },
    }
  );
