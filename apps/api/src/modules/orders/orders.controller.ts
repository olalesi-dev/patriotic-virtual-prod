import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';
import { env } from '@workspace/env';

export const ordersController = new Elysia({ prefix: '/orders' })
  .use(authMacro)
  // Prescriptions
  .get(
    '/prescriptions',
    async ({ user }) => {
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
        .where(eq(schema.patients.organizationId, user.organizationId!))
        .orderBy(desc(schema.prescriptions.createdAt));
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      detail: { summary: 'List Prescriptions', tags: ['Orders'] },
    },
  )
  .patch(
    '/prescriptions/:id',
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
  )

  // Lab Orders
  .get(
    '/labs',
    async ({ user }) => {
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
        .where(eq(schema.patients.organizationId, user.organizationId!))
        .orderBy(desc(schema.labOrders.createdAt));
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      detail: { summary: 'List Lab Orders', tags: ['Orders'] },
    },
  )
  .post(
    '/labs',
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
    '/labs/:id',
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
  )

  // Imaging Orders
  .get(
    '/imaging',
    async ({ user }) => {
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
        .where(eq(schema.patients.organizationId, user.organizationId!))
        .orderBy(desc(schema.imagingOrders.createdAt));
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      detail: { summary: 'List Imaging Orders', tags: ['Orders'] },
    },
  )
  .post(
    '/imaging',
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
    '/imaging/:id',
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
  )

  // PACS
  .get(
    '/pacs/studies',
    async ({ set }) => {
      if (!env.DICOM_BASE_URL) {
        set.status = 503;
        return { error: 'PACS service not configured' };
      }

      try {
        const res = await fetch(`${env.DICOM_BASE_URL}/studies`, {
          headers: {
            'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID!,
            'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET!,
            Accept: 'application/json',
          },
        });

        return await res.json();
      } catch (error: any) {
        set.status = 500;
        return { error: error.message };
      }
    },
    {
      isSignIn: true,
      requirePermissions: ['patients:read'],
      detail: { summary: 'List DICOM Studies', tags: ['Orders'] },
    },
  );
