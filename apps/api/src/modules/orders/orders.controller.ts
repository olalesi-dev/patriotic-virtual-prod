import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';

export const ordersController = new Elysia({ prefix: '/orders' })
  .use(authMacro)
  // Prescriptions
  .get('/prescriptions', async ({ user }) => {
    return await db
      .select({
        prescription: schema.prescriptions,
        patient: schema.patients,
      })
      .from(schema.prescriptions)
      .innerJoin(schema.patients, eq(schema.prescriptions.patientId, schema.patients.id))
      .where(eq(schema.patients.organizationId, user.organizationId!))
      .orderBy(desc(schema.prescriptions.createdAt));
  }, {
    isSignIn: true,
    requirePermissions: ['patients:read'],
    detail: { summary: 'List Prescriptions', tags: ['Orders'] }
  })
  // Lab Orders
  .get('/labs', async ({ user }) => {
    return await db
      .select({
        labOrder: schema.labOrders,
        patient: schema.patients,
      })
      .from(schema.labOrders)
      .innerJoin(schema.patients, eq(schema.labOrders.patientId, schema.patients.id))
      .where(eq(schema.patients.organizationId, user.organizationId!))
      .orderBy(desc(schema.labOrders.createdAt));
  }, {
    isSignIn: true,
    requirePermissions: ['patients:read'],
    detail: { summary: 'List Lab Orders', tags: ['Orders'] }
  })
  // Imaging Orders
  .get('/imaging', async ({ user }) => {
    return await db
      .select({
        imagingOrder: schema.imagingOrders,
        patient: schema.patients,
      })
      .from(schema.imagingOrders)
      .innerJoin(schema.patients, eq(schema.imagingOrders.patientId, schema.patients.id))
      .where(eq(schema.patients.organizationId, user.organizationId!))
      .orderBy(desc(schema.imagingOrders.createdAt));
  }, {
    isSignIn: true,
    requirePermissions: ['patients:read'],
    detail: { summary: 'List Imaging Orders', tags: ['Orders'] }
  })
  .post('/imaging', async ({ body, user }) => {
    const [order] = await db.insert(schema.imagingOrders).values({
      ...body,
      organizationId: user.organizationId!,
      updatedAt: new Date(),
    }).returning();
    return order;
  }, {
    isSignIn: true,
    requirePermissions: ['patients:write'],
    body: t.Object({
      patientId: t.String(),
      providerId: t.String(),
      type: t.String(),
      notes: t.Optional(t.String()),
    }),
    detail: { summary: 'Create Imaging Order', tags: ['Orders'] }
  });
