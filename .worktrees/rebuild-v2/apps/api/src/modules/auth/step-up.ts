import { and, eq, isNotNull } from 'drizzle-orm';
import { accounts } from '@workspace/db/auth-schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

type StepUpDb = PostgresJsDatabase<{
  account: typeof accounts;
}>;

export const verifyPasswordForStepUp = async (
  db: StepUpDb,
  userId: string,
  password: string,
) => {
  if (!userId || !password) {
    return false;
  }

  const [account] = await db
    .select({ passwordHash: accounts.password })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNotNull(accounts.password)))
    .limit(1);

  if (!account?.passwordHash) {
    return false;
  }

  return await Bun.password.verify(password, account.passwordHash);
};
