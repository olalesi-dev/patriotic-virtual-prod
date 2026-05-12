import { eq, sql } from 'drizzle-orm';
import * as schema from '@workspace/db/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

type LoginLockoutDb = PostgresJsDatabase<{
  users: typeof schema.users;
}>;

export type LoginLockoutState = {
  id: string;
  email: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

export const normalizeLoginEmail = (email: unknown) =>
  typeof email === 'string' ? email.trim().toLowerCase() : null;

export const isLoginLocked = (
  state: Pick<LoginLockoutState, 'lockedUntil'> | null | undefined,
  now = new Date(),
) => Boolean(state?.lockedUntil && state.lockedUntil.getTime() > now.getTime());

export const getLoginLockoutStateByEmail = async (
  db: LoginLockoutDb,
  email: string,
) => {
  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      failedLoginAttempts: schema.users.failedLoginAttempts,
      lockedUntil: schema.users.lockedUntil,
    })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  return user ?? null;
};

export const recordFailedLoginAttempt = async (
  db: LoginLockoutDb,
  email: string,
  options: {
    maxAttempts: number;
    lockoutSeconds: number;
    now?: Date;
  },
) => {
  const state = await getLoginLockoutStateByEmail(db, email);
  if (!state) {
    return null;
  }

  const now = options.now ?? new Date();
  const failedLoginAttempts = isLoginLocked(state, now)
    ? state.failedLoginAttempts + 1
    : state.lockedUntil && state.lockedUntil.getTime() <= now.getTime()
      ? 1
      : state.failedLoginAttempts + 1;
  const lockedUntil =
    failedLoginAttempts >= options.maxAttempts
      ? new Date(now.getTime() + options.lockoutSeconds * 1000)
      : null;

  await db
    .update(schema.users)
    .set({
      failedLoginAttempts,
      lockedUntil,
      lastFailedLoginAt: now,
      updatedAt: now,
    })
    .where(eq(schema.users.id, state.id));

  return {
    userId: state.id,
    failedLoginAttempts,
    lockedUntil,
  };
};

export const resetLoginFailures = async (db: LoginLockoutDb, email: string) => {
  await db
    .update(schema.users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
      updatedAt: sql`now()`,
    })
    .where(eq(schema.users.email, email));
};

export const isInvalidCredentialsResponse = (response: unknown) => {
  const value = response as
    | {
        statusCode?: number;
        status?: number | string;
        body?: { code?: string };
        code?: string;
      }
    | undefined;

  return (
    (value?.statusCode === 401 || value?.status === 401) &&
    (value?.body?.code === 'INVALID_EMAIL_OR_PASSWORD' ||
      value?.code === 'INVALID_EMAIL_OR_PASSWORD')
  );
};

export const isSuccessfulSignInResponse = (response: unknown) => {
  const value = response as { token?: string; user?: unknown } | undefined;
  return Boolean(value?.token && value?.user);
};
