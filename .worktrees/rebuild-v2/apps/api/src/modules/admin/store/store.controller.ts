import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc, asc, ilike, or, type SQL } from 'drizzle-orm';

export const storeController = new Elysia({ prefix: '/store' })
  .use(authMacro)
  // Products
  .get('/products', async ({ query, user }) => {
    const { 
      search, 
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    let whereClause: SQL | undefined = eq(schema.shopProducts.organizationId, user.organizationId!);

    if (search) {
      whereClause = and(
        whereClause,
        or(
          ilike(schema.shopProducts.name, `%${search}%`),
          ilike(schema.shopProducts.sku, `%${search}%`),
          ilike(schema.shopProducts.category, `%${search}%`)
        )
      );
    }

    const orderColumn = (schema.shopProducts as any)[sortBy] || schema.shopProducts.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    return await db
      .select()
      .from(schema.shopProducts)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderDirection);
  }, {
    isSignIn: true,
    requirePermissions: ['admin:store:read'],
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
  .get('/orders', async ({ query, user }) => {
    const { 
      search, 
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    let whereClause: SQL | undefined = eq(schema.shopOrders.organizationId, user.organizationId!);

    if (search) {
      whereClause = and(
        whereClause,
        or(
          ilike(schema.shopOrders.orderNumber, `%${search}%`),
          ilike(schema.shopOrders.fulfillmentStatus, `%${search}%`)
        )
      );
    }

    const orderColumn = (schema.shopOrders as any)[sortBy] || schema.shopOrders.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    return await db
      .select()
      .from(schema.shopOrders)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderDirection);
  }, {
    isSignIn: true,
    requirePermissions: ['admin:store:read'],
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
    detail: { summary: 'List Store Orders', tags: ['Admin'] },
  })
  // Partners
  .get('/partners', async ({ query, user }) => {
    const { 
      search, 
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    let whereClause: SQL | undefined = eq(schema.shopPartners.organizationId, user.organizationId!);

    if (search) {
      whereClause = and(
        whereClause,
        or(
          ilike(schema.shopPartners.name, `%${search}%`),
          ilike(schema.shopPartners.category, `%${search}%`)
        )
      );
    }

    const orderColumn = (schema.shopPartners as any)[sortBy] || schema.shopPartners.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    return await db
      .select()
      .from(schema.shopPartners)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderDirection);
  }, {
    isSignIn: true,
    requirePermissions: ['admin:store:read'],
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
