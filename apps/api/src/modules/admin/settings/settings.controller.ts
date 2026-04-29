import { Elysia, t } from 'elysia';
import { authMacro } from '../../auth/macro';
import { db } from '../../../db';
import * as schema from '@workspace/db/schema';
import { eq, and } from 'drizzle-orm';

export const settingsController = new Elysia({ prefix: '/settings' })
  .use(authMacro)
  .get(
    '/:key',
    async ({ params: { key }, user }) => {
      const [setting] = await db
        .select()
        .from(schema.systemSettings)
        .where(
          and(
            eq(schema.systemSettings.key, key),
            eq(schema.systemSettings.organizationId, user.organizationId!)
          )
        )
        .limit(1);
      
      return setting?.value || null;
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:settings:read'],
      params: t.Object({ key: t.String() }),
      detail: { summary: 'Get System Setting', tags: ['Admin'] },
    }
  )
  .post(
    '/:key',
    async ({ params: { key }, body, user }) => {
      const orgId = user.organizationId!;
      const [existing] = await db
        .select()
        .from(schema.systemSettings)
        .where(
          and(
            eq(schema.systemSettings.key, key),
            eq(schema.systemSettings.organizationId, orgId)
          )
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(schema.systemSettings)
          .set({ value: body, updatedAt: new Date() })
          .where(eq(schema.systemSettings.id, existing.id))
          .returning();
        return updated.value;
      }

      const [inserted] = await db
        .insert(schema.systemSettings)
        .values({
          key,
          value: body,
          organizationId: orgId,
        })
        .returning();
      
      return inserted.value;
    },
    {
      isSignIn: true,
      requirePermissions: ['admin:settings:write'],
      params: t.Object({ key: t.String() }),
      body: t.Any(),
      detail: { summary: 'Update System Setting', tags: ['Admin'] },
    }
  );
