import { describe, expect, it } from 'bun:test';
import { verifyPasswordForStepUp } from './step-up';

const createStepUpDb = (passwordHash?: string) =>
  ({
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  return Promise.resolve(
                    passwordHash ? [{ passwordHash }] : [],
                  );
                },
              };
            },
          };
        },
      };
    },
  }) as never;

describe('step-up authentication', () => {
  it('verifies the current password against the stored Better Auth account hash', async () => {
    const passwordHash = await Bun.password.hash(
      'correct-password',
      'argon2id',
    );

    await expect(
      verifyPasswordForStepUp(
        createStepUpDb(passwordHash),
        'user-1',
        'correct-password',
      ),
    ).resolves.toBe(true);

    await expect(
      verifyPasswordForStepUp(
        createStepUpDb(passwordHash),
        'user-1',
        'wrong-password',
      ),
    ).resolves.toBe(false);
  });

  it('does not mark step-up for users without a password account', async () => {
    await expect(
      verifyPasswordForStepUp(createStepUpDb(), 'user-1', 'anything'),
    ).resolves.toBe(false);
  });
});
