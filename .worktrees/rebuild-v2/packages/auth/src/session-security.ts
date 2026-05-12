import { and, eq, sql } from 'drizzle-orm';
import * as schema from '@workspace/db/schema';
import * as authSchema from '@workspace/db/auth-schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

type AuthSecurityDb = PostgresJsDatabase<{
  users: typeof schema.users;
  sessions: typeof authSchema.sessions;
  twoFactors: typeof authSchema.twoFactors;
}>;

export type AuthSecurityReason =
  | 'password_change'
  | 'password_reset'
  | 'mfa_reset'
  | 'role_change'
  | 'permission_downgrade'
  | 'account_disabled'
  | 'suspected_compromise'
  | 'logout_all'
  | 'manual_admin_action';

type SessionLike = {
  id?: string;
  userId?: string;
  tokenVersion?: number | null;
};

type SessionActivity = {
  lastActivityAt: Date;
};

type SessionStepUpState = {
  stepUpAuthenticatedAt: Date | null;
};

type UserTokenState = {
  tokenVersion: number;
  tokenVersionUpdatedAt: Date;
  disabled: boolean;
};

export const getUserTokenState = async (db: AuthSecurityDb, userId: string) => {
  const [user] = await db
    .select({
      tokenVersion: schema.users.tokenVersion,
      tokenVersionUpdatedAt: schema.users.tokenVersionUpdatedAt,
      disabled: schema.users.disabled,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return user ?? null;
};

export const getUserTokenVersion = async (
  db: AuthSecurityDb,
  userId: string,
) => {
  const state = await getUserTokenState(db, userId);
  return state?.tokenVersion ?? null;
};

export const isSessionTokenVersionCurrent = async (
  db: AuthSecurityDb,
  session: SessionLike | null | undefined,
) => {
  if (!session?.userId || typeof session.tokenVersion !== 'number') {
    return false;
  }

  const state = await getUserTokenState(db, session.userId);
  if (!state || state.disabled) {
    return false;
  }

  return state.tokenVersion === session.tokenVersion;
};

export const getSessionActivity = async (
  db: AuthSecurityDb,
  sessionId: string,
) => {
  const [session] = await db
    .select({
      lastActivityAt: authSchema.sessions.lastActivityAt,
    })
    .from(authSchema.sessions)
    .where(eq(authSchema.sessions.id, sessionId))
    .limit(1);

  return session ?? null;
};

export const getSessionStepUpState = async (
  db: AuthSecurityDb,
  sessionId: string,
) => {
  const [session] = await db
    .select({
      stepUpAuthenticatedAt: authSchema.sessions.stepUpAuthenticatedAt,
    })
    .from(authSchema.sessions)
    .where(eq(authSchema.sessions.id, sessionId))
    .limit(1);

  return session ?? null;
};

export const isSessionStepUpFresh = async (
  db: AuthSecurityDb,
  session: SessionLike | null | undefined,
  options: {
    maxAgeSeconds: number;
    now?: Date;
    stepUpState?: SessionStepUpState | null;
  },
) => {
  if (!session?.id) {
    return false;
  }

  if (options.maxAgeSeconds <= 0) {
    return true;
  }

  const state =
    options.stepUpState ?? (await getSessionStepUpState(db, session.id));
  if (!state?.stepUpAuthenticatedAt) {
    return false;
  }

  const now = options.now ?? new Date();
  const ageMs = now.getTime() - state.stepUpAuthenticatedAt.getTime();
  return ageMs <= options.maxAgeSeconds * 1000;
};

export const markSessionStepUpAuthenticated = async (
  db: AuthSecurityDb,
  session: SessionLike | null | undefined,
  options: { now?: Date } = {},
) => {
  if (!session?.id) {
    return false;
  }

  const now = options.now ?? new Date();
  await db
    .update(authSchema.sessions)
    .set({
      stepUpAuthenticatedAt: now,
      updatedAt: now,
    })
    .where(eq(authSchema.sessions.id, session.id));

  return true;
};

export const isSessionWithinIdleTimeout = async (
  db: AuthSecurityDb,
  session: SessionLike | null | undefined,
  options: {
    idleTimeoutSeconds: number;
    now?: Date;
  },
) => {
  if (!session?.id) {
    return false;
  }

  if (options.idleTimeoutSeconds <= 0) {
    return true;
  }

  const activity = await getSessionActivity(db, session.id);
  if (!activity) {
    return false;
  }

  const now = options.now ?? new Date();
  const idleAgeMs = now.getTime() - activity.lastActivityAt.getTime();
  return idleAgeMs <= options.idleTimeoutSeconds * 1000;
};

export const touchSessionActivity = async (
  db: AuthSecurityDb,
  session: SessionLike | null | undefined,
  options: {
    updateThrottleSeconds: number;
    now?: Date;
    activity?: SessionActivity | null;
  },
) => {
  if (!session?.id) {
    return false;
  }

  const now = options.now ?? new Date();
  const activity =
    options.activity ?? (await getSessionActivity(db, session.id));
  if (!activity) {
    return false;
  }

  const ageMs = now.getTime() - activity.lastActivityAt.getTime();
  if (ageMs < Math.max(options.updateThrottleSeconds, 0) * 1000) {
    return false;
  }

  await db
    .update(authSchema.sessions)
    .set({
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(authSchema.sessions.id, session.id));

  return true;
};

export const isJwtIssuedAfterTokenVersionUpdate = (
  payload: { iat?: number; auth_time?: number },
  userTokenState: UserTokenState,
) => {
  const issuedAtSeconds = payload.auth_time ?? payload.iat;
  if (!issuedAtSeconds) {
    return false;
  }

  const tokenVersionUpdatedAtSeconds = Math.floor(
    userTokenState.tokenVersionUpdatedAt.getTime() / 1000,
  );
  return issuedAtSeconds >= tokenVersionUpdatedAtSeconds;
};

export const isUserMfaVerified = async (db: AuthSecurityDb, userId: string) => {
  const [user] = await db
    .select({
      twoFactorEnabled: schema.users.twoFactorEnabled,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user?.twoFactorEnabled) {
    return false;
  }

  const [factor] = await db
    .select({
      verified: authSchema.twoFactors.verified,
    })
    .from(authSchema.twoFactors)
    .where(eq(authSchema.twoFactors.userId, userId))
    .limit(1);

  return factor?.verified === true;
};

export const revokeUserSessions = async (
  db: AuthSecurityDb,
  userId: string,
  options: { exceptSessionId?: string } = {},
) => {
  const whereClause = options.exceptSessionId
    ? and(
        eq(authSchema.sessions.userId, userId),
        sql`${authSchema.sessions.id} <> ${options.exceptSessionId}`,
      )
    : eq(authSchema.sessions.userId, userId);

  return db.delete(authSchema.sessions).where(whereClause);
};

export const revokeSession = async (db: AuthSecurityDb, sessionId: string) => {
  return db
    .delete(authSchema.sessions)
    .where(eq(authSchema.sessions.id, sessionId));
};

export const bumpUserTokenVersion = async (
  db: AuthSecurityDb,
  userId: string,
) => {
  const [user] = await db
    .update(schema.users)
    .set({
      tokenVersion: sql`${schema.users.tokenVersion} + 1`,
      tokenVersionUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId))
    .returning({ tokenVersion: schema.users.tokenVersion });

  return user?.tokenVersion ?? null;
};

export const revokeUserAuth = async (
  db: AuthSecurityDb,
  userId: string,
  _reason: AuthSecurityReason,
  options: { exceptSessionId?: string } = {},
) => {
  const tokenVersion = await bumpUserTokenVersion(db, userId);
  await revokeUserSessions(db, userId, options);

  return {
    revoked: tokenVersion !== null,
    tokenVersion,
  };
};
