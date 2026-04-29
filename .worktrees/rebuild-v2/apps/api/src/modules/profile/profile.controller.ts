import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db/schema';
import { eq, and } from 'drizzle-orm';
import { NotFoundException } from '../../utils/errors';

export const profileController = new Elysia({ prefix: '/profile' })
  .use(authMacro)
  .get(
    '/me',
    async ({ user }) => {
      const [userData] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1);

      if (!userData) throw new NotFoundException('User not found');

      let providerData = null;
      let patientData = null;

      if (user.role === 'Provider') {
        [providerData] = await db
          .select()
          .from(schema.providers)
          .where(eq(schema.providers.userId, user.id))
          .limit(1);
      } else {
        [patientData] = await db
          .select()
          .from(schema.patients)
          .where(eq(schema.patients.userId, user.id))
          .limit(1);
      }

      const settings = await db
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, user.id));

      return {
        user: userData,
        provider: providerData,
        patient: patientData,
        settings: settings.reduce((acc: any, s) => {
          acc[s.key] = s.value;
          return acc;
        }, {}),
      };
    },
    {
      isSignIn: true,
      detail: { summary: 'Get My Profile & Settings', tags: ['Profile'] },
    },
  )
  .patch(
    '/me',
    async ({ body, user }) => {
      const { name, phone, image, ...profileData } = body as any;

      await db.transaction(async (tx) => {
        // 1. Update base user
        await tx
          .update(schema.users)
          .set({ name, phone, image, updatedAt: new Date() })
          .where(eq(schema.users.id, user.id));

        // 2. Update role-specific profile
        if (user.role === 'Provider') {
          await tx
            .update(schema.providers)
            .set({ ...profileData, updatedAt: new Date() })
            .where(eq(schema.providers.userId, user.id));
        } else {
          await tx
            .update(schema.patients)
            .set({ ...profileData, updatedAt: new Date() })
            .where(eq(schema.patients.userId, user.id));
        }
      });

      return { success: true };
    },
    {
      isSignIn: true,
      body: t.Object({
        name: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        image: t.Optional(t.String()),
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        title: t.Optional(t.String()),
        specialty: t.Optional(t.String()),
        bio: t.Optional(t.String()),
      }),
      detail: { summary: 'Update My Profile', tags: ['Profile'] },
    },
  )
  .get(
    '/settings/:key',
    async ({ params: { key }, user }) => {
      const [setting] = await db
        .select()
        .from(schema.userSettings)
        .where(
          and(
            eq(schema.userSettings.key, key),
            eq(schema.userSettings.userId, user.id),
          ),
        )
        .limit(1);

      return setting?.value || null;
    },
    {
      isSignIn: true,
      params: t.Object({ key: t.String() }),
      detail: { summary: 'Get User Setting', tags: ['Profile'] },
    },
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
            eq(schema.userSettings.userId, user.id),
          ),
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
    },
  );
