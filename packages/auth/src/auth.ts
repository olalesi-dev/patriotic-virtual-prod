import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor, admin } from 'better-auth/plugins';
import { env } from '@workspace/env';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@workspace/db';
import { sendWelcomeEmailForCreatedUser } from './email-hooks';
import { getUserPermissionsAndModules } from './permissions';

const connection = postgres(
  env.DATABASE_URL?.trim()
    ? env.DATABASE_URL
    : 'postgres://dummy:dummy@localhost/dummy',
);
const db = drizzle(connection, { schema });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactors,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: 'string',
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password: string) => {
        return await Bun.password.hash(password, 'argon2id');
      },
      verify: async ({ password, hash }: { password: string; hash: string }) => {
        return await Bun.password.verify(password, hash);
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-secret',
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await sendWelcomeEmailForCreatedUser(user);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const { role, permissions, allowedModules } =
            await getUserPermissionsAndModules(db, session.userId);
          return {
            data: {
              ...session,
              role,
              permissions,
              allowedModules,
            },
          };
        },
      },
    },
  },
  plugins: [twoFactor(), admin()],
});
