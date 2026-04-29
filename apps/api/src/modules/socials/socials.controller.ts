import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';

export const socialsController = new Elysia({ prefix: '/socials' })
  .use(authMacro)
  .get(
    '/posts',
    async ({ user }) => {
      return await db
        .select({
          post: schema.socialPosts,
          author: {
            id: schema.users.id,
            name: schema.users.name,
          },
        })
        .from(schema.socialPosts)
        .innerJoin(schema.users, eq(schema.socialPosts.authorId, schema.users.id))
        .where(eq(schema.socialPosts.organizationId, user.organizationId!))
        .orderBy(desc(schema.socialPosts.createdAt));
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:read'],
      detail: { summary: 'List Social Posts', tags: ['Socials'] },
    }
  )
  .post(
    '/posts',
    async ({ body, user }) => {
      const [post] = await db
        .insert(schema.socialPosts)
        .values({
          organizationId: user.organizationId!,
          authorId: user.id,
          text: body.text,
          platforms: body.platforms,
          status: 'published',
          updatedAt: new Date(),
        })
        .returning();
      return post;
    },
    {
      isSignIn: true,
      requirePermissions: ['communications:write'],
      body: t.Object({
        text: t.String(),
        platforms: t.Optional(t.Array(t.String())),
      }),
      detail: { summary: 'Create Social Post', tags: ['Socials'] },
    }
  );
