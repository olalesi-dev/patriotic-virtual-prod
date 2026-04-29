import { describe, expect, it } from 'bun:test';

describe('Bun Password Hashing (Argon2)', () => {
  it('should hash and verify passwords using Argon2id', async () => {
    const password = 'my-secret-password';
    const hash = await Bun.password.hash(password, 'argon2id');

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const isMatch = await Bun.password.verify(password, hash);
    expect(isMatch).toBe(true);

    const isInvalid = await Bun.password.verify('wrong-password', hash);
    expect(isInvalid).toBe(false);
  });
});
