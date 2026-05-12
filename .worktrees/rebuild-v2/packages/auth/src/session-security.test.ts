import { describe, expect, it } from 'bun:test';
import {
  getUserTokenVersion,
  isJwtIssuedAfterTokenVersionUpdate,
  isUserMfaVerified,
  isSessionStepUpFresh,
  isSessionWithinIdleTimeout,
  isSessionTokenVersionCurrent,
  markSessionStepUpAuthenticated,
  revokeSession,
  revokeUserAuth,
  revokeUserSessions,
  touchSessionActivity,
} from './session-security';

const createDb = () => {
  const state = {
    tokenVersion: 3,
    tokenVersionUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    disabled: false,
    deletedWhere: null as unknown,
    updated: false,
  };

  const db = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  return Promise.resolve([
                    {
                      tokenVersion: state.tokenVersion,
                      tokenVersionUpdatedAt: state.tokenVersionUpdatedAt,
                      disabled: state.disabled,
                    },
                  ]);
                },
              };
            },
          };
        },
      };
    },
    update() {
      state.updated = true;
      return {
        set() {
          state.tokenVersion += 1;
          state.tokenVersionUpdatedAt = new Date();
          return {
            where() {
              return {
                returning() {
                  return Promise.resolve([
                    { tokenVersion: state.tokenVersion },
                  ]);
                },
              };
            },
          };
        },
      };
    },
    delete() {
      return {
        where(whereClause: unknown) {
          state.deletedWhere = whereClause;
          return Promise.resolve();
        },
      };
    },
  };

  return { db: db as never, state };
};

const createMfaDb = (options: {
  twoFactorEnabled: boolean;
  verified?: boolean | null;
}) => {
  let selectCall = 0;
  const db = {
    select() {
      selectCall += 1;
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  if (selectCall === 1) {
                    return Promise.resolve([
                      { twoFactorEnabled: options.twoFactorEnabled },
                    ]);
                  }

                  return Promise.resolve(
                    typeof options.verified === 'boolean'
                      ? [{ verified: options.verified }]
                      : [],
                  );
                },
              };
            },
          };
        },
      };
    },
  };

  return db as never;
};

const createSessionActivityDb = (lastActivityAt: Date | null) => {
  const state = {
    lastActivityAt,
    touchedAt: null as Date | null,
    deletedWhere: null as unknown,
  };

  const db = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  return Promise.resolve(
                    state.lastActivityAt
                      ? [{ lastActivityAt: state.lastActivityAt }]
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
        set(values: { lastActivityAt?: Date }) {
          if (values.lastActivityAt) {
            state.touchedAt = values.lastActivityAt;
          }
          return {
            where() {
              return Promise.resolve();
            },
          };
        },
      };
    },
    delete() {
      return {
        where(whereClause: unknown) {
          state.deletedWhere = whereClause;
          return Promise.resolve();
        },
      };
    },
  };

  return { db: db as never, state };
};

const createSessionStepUpDb = (stepUpAuthenticatedAt: Date | null) => {
  const state = {
    stepUpAuthenticatedAt,
    markedAt: null as Date | null,
  };

  const db = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  return Promise.resolve([
                    { stepUpAuthenticatedAt: state.stepUpAuthenticatedAt },
                  ]);
                },
              };
            },
          };
        },
      };
    },
    update() {
      return {
        set(values: { stepUpAuthenticatedAt?: Date }) {
          if (values.stepUpAuthenticatedAt) {
            state.markedAt = values.stepUpAuthenticatedAt;
            state.stepUpAuthenticatedAt = values.stepUpAuthenticatedAt;
          }
          return {
            where() {
              return Promise.resolve();
            },
          };
        },
      };
    },
  };

  return { db: db as never, state };
};

describe('session security', () => {
  it('reads the current user token version', async () => {
    const { db } = createDb();

    await expect(getUserTokenVersion(db, 'user-1')).resolves.toBe(3);
  });

  it('accepts only sessions with the current token version', async () => {
    const { db } = createDb();

    await expect(
      isSessionTokenVersionCurrent(db, {
        userId: 'user-1',
        tokenVersion: 3,
      }),
    ).resolves.toBe(true);

    await expect(
      isSessionTokenVersionCurrent(db, {
        userId: 'user-1',
        tokenVersion: 2,
      }),
    ).resolves.toBe(false);
  });

  it('rejects sessions for disabled users', async () => {
    const { db, state } = createDb();
    state.disabled = true;

    await expect(
      isSessionTokenVersionCurrent(db, {
        userId: 'user-1',
        tokenVersion: 3,
      }),
    ).resolves.toBe(false);
  });

  it('rejects JWT payloads issued before local token revocation', () => {
    expect(
      isJwtIssuedAfterTokenVersionUpdate(
        { iat: 1770000000 },
        {
          tokenVersion: 4,
          tokenVersionUpdatedAt: new Date('2026-02-01T00:00:00.000Z'),
          disabled: false,
        },
      ),
    ).toBe(true);

    expect(
      isJwtIssuedAfterTokenVersionUpdate(
        { iat: 1700000000 },
        {
          tokenVersion: 4,
          tokenVersionUpdatedAt: new Date('2026-02-01T00:00:00.000Z'),
          disabled: false,
        },
      ),
    ).toBe(false);
  });

  it('bumps the token version and revokes sessions for high-risk changes', async () => {
    const { db, state } = createDb();

    await expect(
      revokeUserAuth(db, 'user-1', 'suspected_compromise'),
    ).resolves.toEqual({
      revoked: true,
      tokenVersion: 4,
    });
    expect(state.updated).toBe(true);
    expect(state.deletedWhere).toBeDefined();
  });

  it('can revoke sessions without bumping the token version', async () => {
    const { db, state } = createDb();

    await revokeUserSessions(db, 'user-1');

    expect(state.tokenVersion).toBe(3);
    expect(state.deletedWhere).toBeDefined();
  });

  it('rejects sessions past the server-side idle timeout', async () => {
    const { db } = createSessionActivityDb(
      new Date('2026-01-01T00:00:00.000Z'),
    );

    await expect(
      isSessionWithinIdleTimeout(
        db,
        { id: 'session-1', userId: 'user-1' },
        {
          idleTimeoutSeconds: 900,
          now: new Date('2026-01-01T00:14:59.000Z'),
        },
      ),
    ).resolves.toBe(true);

    await expect(
      isSessionWithinIdleTimeout(
        db,
        { id: 'session-1', userId: 'user-1' },
        {
          idleTimeoutSeconds: 900,
          now: new Date('2026-01-01T00:15:01.000Z'),
        },
      ),
    ).resolves.toBe(false);
  });

  it('touches session activity only after the configured throttle', async () => {
    const { db, state } = createSessionActivityDb(
      new Date('2026-01-01T00:00:00.000Z'),
    );

    await expect(
      touchSessionActivity(
        db,
        { id: 'session-1', userId: 'user-1' },
        {
          updateThrottleSeconds: 60,
          now: new Date('2026-01-01T00:00:30.000Z'),
        },
      ),
    ).resolves.toBe(false);
    expect(state.touchedAt).toBeNull();

    await expect(
      touchSessionActivity(
        db,
        { id: 'session-1', userId: 'user-1' },
        {
          updateThrottleSeconds: 60,
          now: new Date('2026-01-01T00:01:01.000Z'),
        },
      ),
    ).resolves.toBe(true);
    expect(state.touchedAt?.toISOString()).toBe('2026-01-01T00:01:01.000Z');
  });

  it('requires an explicit recent step-up marker for sensitive routes', async () => {
    const { db } = createSessionStepUpDb(new Date('2026-01-01T00:00:00.000Z'));

    await expect(
      isSessionStepUpFresh(
        db,
        { id: 'session-1', userId: 'user-1' },
        {
          maxAgeSeconds: 300,
          now: new Date('2026-01-01T00:04:59.000Z'),
        },
      ),
    ).resolves.toBe(true);

    await expect(
      isSessionStepUpFresh(
        db,
        { id: 'session-1', userId: 'user-1' },
        {
          maxAgeSeconds: 300,
          now: new Date('2026-01-01T00:05:01.000Z'),
        },
      ),
    ).resolves.toBe(false);
  });

  it('marks a session as step-up authenticated server-side', async () => {
    const { db, state } = createSessionStepUpDb(null);
    const now = new Date('2026-01-01T00:02:00.000Z');

    await expect(
      markSessionStepUpAuthenticated(
        db,
        { id: 'session-1', userId: 'user-1' },
        { now },
      ),
    ).resolves.toBe(true);

    expect(state.markedAt?.toISOString()).toBe('2026-01-01T00:02:00.000Z');
  });

  it('can revoke one expired session without bumping token version', async () => {
    const { db, state } = createSessionActivityDb(
      new Date('2026-01-01T00:00:00.000Z'),
    );

    await revokeSession(db, 'session-1');

    expect(state.deletedWhere).toBeDefined();
  });

  it('requires an enabled and verified MFA factor', async () => {
    await expect(
      isUserMfaVerified(
        createMfaDb({ twoFactorEnabled: true, verified: true }),
        'user-1',
      ),
    ).resolves.toBe(true);

    await expect(
      isUserMfaVerified(
        createMfaDb({ twoFactorEnabled: true, verified: false }),
        'user-1',
      ),
    ).resolves.toBe(false);

    await expect(
      isUserMfaVerified(
        createMfaDb({ twoFactorEnabled: false, verified: true }),
        'user-1',
      ),
    ).resolves.toBe(false);
  });
});
