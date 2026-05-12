import { describe, expect, it } from 'bun:test';
import {
  isInvalidCredentialsResponse,
  isLoginLocked,
  isSuccessfulSignInResponse,
  normalizeLoginEmail,
  recordFailedLoginAttempt,
  resetLoginFailures,
} from './login-lockout';

const createDb = (
  state: {
    id?: string;
    email?: string;
    failedLoginAttempts?: number;
    lockedUntil?: Date | null;
  } | null,
) => {
  const writes: Array<Record<string, unknown>> = [];
  const db = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  return Promise.resolve(
                    state
                      ? [
                          {
                            id: state.id ?? 'user-1',
                            email: state.email ?? 'user@example.com',
                            failedLoginAttempts: state.failedLoginAttempts ?? 0,
                            lockedUntil: state.lockedUntil ?? null,
                          },
                        ]
                      : [],
                  );
                },
              };
            },
          };
        },
      };
    },
    update() {
      return {
        set(values: Record<string, unknown>) {
          writes.push(values);
          return {
            where() {
              return Promise.resolve();
            },
          };
        },
      };
    },
  };

  return { db: db as never, writes };
};

describe('login lockout', () => {
  it('normalizes login email input', () => {
    expect(normalizeLoginEmail(' USER@Example.COM ')).toBe('user@example.com');
    expect(normalizeLoginEmail(undefined)).toBeNull();
  });

  it('detects active locks only when locked_until is in the future', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    expect(
      isLoginLocked({ lockedUntil: new Date('2026-01-01T00:00:01.000Z') }, now),
    ).toBe(true);
    expect(
      isLoginLocked({ lockedUntil: new Date('2025-12-31T23:59:59.000Z') }, now),
    ).toBe(false);
  });

  it('records failed attempts and locks on threshold', async () => {
    const { db, writes } = createDb({
      failedLoginAttempts: 4,
      lockedUntil: null,
    });
    const now = new Date('2026-01-01T00:00:00.000Z');

    const result = await recordFailedLoginAttempt(db, 'user@example.com', {
      maxAttempts: 5,
      lockoutSeconds: 900,
      now,
    });

    expect(result?.failedLoginAttempts).toBe(5);
    expect(result?.lockedUntil?.toISOString()).toBe('2026-01-01T00:15:00.000Z');
    expect(writes[0].failedLoginAttempts).toBe(5);
  });

  it('starts a fresh count when an old lock has expired', async () => {
    const { db } = createDb({
      failedLoginAttempts: 5,
      lockedUntil: new Date('2025-12-31T23:00:00.000Z'),
    });

    const result = await recordFailedLoginAttempt(db, 'user@example.com', {
      maxAttempts: 5,
      lockoutSeconds: 900,
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(result?.failedLoginAttempts).toBe(1);
    expect(result?.lockedUntil).toBeNull();
  });

  it('does not create lockout rows for unknown users', async () => {
    const { db, writes } = createDb(null);

    await expect(
      recordFailedLoginAttempt(db, 'missing@example.com', {
        maxAttempts: 5,
        lockoutSeconds: 900,
      }),
    ).resolves.toBeNull();
    expect(writes).toHaveLength(0);
  });

  it('resets failure counters after successful sign-in', async () => {
    const { db, writes } = createDb({
      failedLoginAttempts: 2,
      lockedUntil: null,
    });

    await resetLoginFailures(db, 'user@example.com');

    expect(writes[0]).toMatchObject({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    });
  });

  it('classifies Better Auth sign-in responses', () => {
    expect(
      isInvalidCredentialsResponse({
        statusCode: 401,
        body: { code: 'INVALID_EMAIL_OR_PASSWORD' },
      }),
    ).toBe(true);
    expect(
      isSuccessfulSignInResponse({
        token: 'session-token',
        user: { id: 'user-1' },
      }),
    ).toBe(true);
  });
});
