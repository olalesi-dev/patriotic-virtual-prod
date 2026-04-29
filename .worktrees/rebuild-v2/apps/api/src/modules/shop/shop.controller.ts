import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ShopService } from './shop.service';

const service = new ShopService();

export const shopController = new Elysia({ prefix: '/shop' })
  .use(authMacro)
  .get(
    '/products',
    async ({ user }) => {
      return await db
        .select()
        .from(schema.shopProducts)
        .where(
          and(
            eq(schema.shopProducts.organizationId, user.organizationId!),
            eq(schema.shopProducts.status, 'Active'),
          ),
        )
        .orderBy(desc(schema.shopProducts.createdAt));
    },
    {
      isSignIn: true,
      detail: { summary: 'List Active Products', tags: ['Shop'] },
    }
  )
  .post(
    '/checkout',
    async ({ body, user, headers }) => {
      return await service.createCheckoutSession({
        userId: user.id,
        items: body.items,
        origin: headers['origin'],
      });
    },
    {
      isSignIn: true,
      body: t.Object({
        items: t.Array(
          t.Object({
            productId: t.String(),
            quantity: t.Number(),
          }),
        ),
      }),
      detail: { summary: 'Create Shop Checkout Session', tags: ['Shop'] },
    }
  )
  .post(
    '/checkout/confirm',
    async ({ body }) => {
      return await service.confirmOrder(body.sessionId);
    },
    {
      isSignIn: true,
      body: t.Object({
        sessionId: t.String(),
      }),
      detail: { summary: 'Confirm Shop Order', tags: ['Shop'] },
    }
  );
