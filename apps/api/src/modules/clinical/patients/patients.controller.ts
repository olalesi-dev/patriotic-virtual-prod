import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db';
import { eq, and, or, ilike, desc } from 'drizzle-orm';

export const patientsController = new Elysia({ prefix: '/patients' })
  .use(authMacro)
  .get(
    '/',
    async ({ query, user }) => {
      const { search, limit = '20', offset = '0' } = query;
      
      let whereClause = eq(schema.patients.organizationId, user.organizationId!);
      
      if (search) {
        whereClause = and(
          whereClause,
          or(
            ilike(schema.patients.firstName, `%${search}%`),
            ilike(schema.patients.lastName, `%${search}%`),
            ilike(schema.patients.email, `%${search}%`)
          )
        ) as any;
      }

      const items = await db
        .select()
        .from(schema.patients)
        .where(whereClause)
        .limit(Number(limit))
        .offset(Number(offset))
        .orderBy(desc(schema.patients.createdAt));

      return { items };
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
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
  );
