import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and } from 'drizzle-orm';

export const profileController = new Elysia({ prefix: '/profile' })
  .use(authMacro)
  .get(
    '/settings/:key',
    async ({ params: { key }, user }) => {
      const [setting] = await db
        .select()
        .from(schema.userSettings)
        .where(
          and(
            eq(schema.userSettings.key, key),
            eq(schema.userSettings.userId, user.id)
          )
        )
        .limit(1);
      
      return setting?.value || null;
    },
    {
      isSignIn: true,
      params: t.Object({ key: t.String() }),
      detail: { summary: 'Get User Setting', tags: ['Profile'] },
    }
  )
  .post(
    '/settings/:key',
    async ({ params: { key }, body, user }) => {
      const [existing] = await db
        .select()
        .from(schema.userSettings)
        .where(
          and(
            eq(schema.userSettings.key, key),
            eq(schema.userSettings.userId, user.id)
          )
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(schema.userSettings)
          .set({ value: body, updatedAt: new Date() })
          .where(eq(schema.userSettings.id, existing.id))
          .returning();
        return updated.value;
      }

      const [inserted] = await db
        .insert(schema.userSettings)
        .values({
          userId: user.id,
          key,
          value: body,
        })
        .returning();
      
      return inserted.value;
    },
    {
      isSignIn: true,
      params: t.Object({ key: t.String() }),
      body: t.Any(),
      detail: { summary: 'Update User Setting', tags: ['Profile'] },
    }
  );
