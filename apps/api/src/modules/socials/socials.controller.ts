import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, desc, sql, or } from 'drizzle-orm';

export const socialsController = new Elysia({ prefix: '/socials' })
  .use(authMacro)
  // Social Posts (Provider Broadcasts)
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
  )
  
  // Community Forum
  .group('/community', { isSignIn: true }, (app) =>
    app
      .get('/profile', async ({ user }) => {
        const [profile] = await db
          .select()
          .from(schema.communityProfiles)
          .where(eq(schema.communityProfiles.userId, user.id))
          .limit(1);
        return profile || null;
      })
      .post('/profile', async ({ body, user }) => {
        const [existing] = await db
          .select()
          .from(schema.communityProfiles)
          .where(eq(schema.communityProfiles.userId, user.id))
          .limit(1);

        if (existing) {
          const [updated] = await db
            .update(schema.communityProfiles)
            .set({ ...body, updatedAt: new Date() })
            .where(eq(schema.communityProfiles.id, existing.id))
            .returning();
          return updated;
        }

        const [inserted] = await db
          .insert(schema.communityProfiles)
          .values({
            ...body,
            userId: user.id,
            updatedAt: new Date(),
          })
          .returning();
        return inserted;
      }, {
        body: t.Object({
          displayName: t.String(),
          bio: t.Optional(t.String()),
          avatarUrl: t.Optional(t.String()),
          journeyTag: t.Optional(t.String()),
        })
      })
      .get('/feed', async ({ user }) => {
        return await db
          .select({
            post: schema.communityPosts,
            author: {
              id: schema.users.id,
              name: schema.users.name,
              image: schema.users.image,
            }
          })
          .from(schema.communityPosts)
          .innerJoin(schema.users, eq(schema.communityPosts.authorId, schema.users.id))
          .where(
            and(
              eq(schema.communityPosts.organizationId, user.organizationId!),
              eq(schema.communityPosts.isHidden, false)
            )
          )
          .orderBy(desc(schema.communityPosts.createdAt));
      })
      .post('/feed', async ({ body, user }) => {
        const [post] = await db
          .insert(schema.communityPosts)
          .values({
            organizationId: user.organizationId!,
            authorId: user.id,
            text: body.text,
            mediaUrl: body.mediaUrl,
            mediaType: body.mediaType,
            updatedAt: new Date(),
          })
          .returning();
        return post;
      }, {
        body: t.Object({
          text: t.String(),
          mediaUrl: t.Optional(t.String()),
          mediaType: t.Optional(t.String()),
        })
      })
      .post('/posts/:id/like', async ({ params: { id }, user }) => {
        return await db.transaction(async (tx) => {
          const [existing] = await tx
            .select()
            .from(schema.communityLikes)
            .where(
              and(
                eq(schema.communityLikes.postId, id),
                eq(schema.communityLikes.userId, user.id)
              )
            )
            .limit(1);

          if (existing) {
            await tx.delete(schema.communityLikes).where(eq(schema.communityLikes.id, existing.id));
            await tx.update(schema.communityPosts).set({ likesCount: sql`${schema.communityPosts.likesCount} - 1` }).where(eq(schema.communityPosts.id, id));
            return { liked: false };
          }

          await tx.insert(schema.communityLikes).values({ postId: id, userId: user.id });
          await tx.update(schema.communityPosts).set({ likesCount: sql`${schema.communityPosts.likesCount} + 1` }).where(eq(schema.communityPosts.id, id));
          return { liked: true };
        });
      })
  );
