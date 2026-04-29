import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';

export const storeController = new Elysia({ prefix: '/store' })
  .use(authMacro)
  // Products
  .get('/products', async ({ user }) => {
    return await db
      .select()
      .from(schema.shopProducts)
      .where(eq(schema.shopProducts.organizationId, user.organizationId!))
      .orderBy(desc(schema.shopProducts.createdAt));
  }, {
    isSignIn: true,
    requirePermissions: ['admin:store:read'],
    detail: { summary: 'List Store Products', tags: ['Admin'] },
  })
  .post('/products', async ({ body, user }) => {
    const [product] = await db.insert(schema.shopProducts).values({
      ...body,
      organizationId: user.organizationId!,
      updatedAt: new Date(),
    }).returning();
    return product;
  }, {
    isSignIn: true,
    requirePermissions: ['admin:store:write'],
    body: t.Object({
      name: t.String(),
      slug: t.String(),
      sku: t.String(),
      price: t.Number(),
      category: t.String(),
      status: t.Optional(t.String()),
      shortDescription: t.Optional(t.String()),
      longDescription: t.Optional(t.String()),
    }),
    detail: { summary: 'Create Store Product', tags: ['Admin'] },
  })
  // Orders
  .get('/orders', async ({ user }) => {
    return await db
      .select()
      .from(schema.shopOrders)
      .where(eq(schema.shopOrders.organizationId, user.organizationId!))
      .orderBy(desc(schema.shopOrders.createdAt));
  }, {
    isSignIn: true,
    requirePermissions: ['admin:store:read'],
    detail: { summary: 'List Store Orders', tags: ['Admin'] },
  })
  // Partners
  .get('/partners', async ({ user }) => {
    return await db
      .select()
      .from(schema.shopPartners)
      .where(eq(schema.shopPartners.organizationId, user.organizationId!))
      .orderBy(desc(schema.shopPartners.createdAt));
  }, {
    isSignIn: true,
    requirePermissions: ['admin:store:read'],
    detail: { summary: 'List Store Partners', tags: ['Admin'] },
  })
  .post('/partners', async ({ body, user }) => {
    const [partner] = await db.insert(schema.shopPartners).values({
      ...body,
      organizationId: user.organizationId!,
      updatedAt: new Date(),
    }).returning();
    return partner;
  }, {
    isSignIn: true,
    requirePermissions: ['admin:store:write'],
    body: t.Object({
      name: t.String(),
      category: t.String(),
      logo: t.Optional(t.String()),
      status: t.Optional(t.String()),
      isFeatured: t.Optional(t.Boolean()),
    }),
    detail: { summary: 'Create Store Partner', tags: ['Admin'] },
  });
