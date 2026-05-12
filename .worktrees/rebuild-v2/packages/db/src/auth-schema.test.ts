import { describe, expect, test } from 'bun:test';
import * as authSchema from './auth-schema';

describe('Auth Database Schema', () => {
  test('sessions include token versioning for server-side revocation', () => {
    expect(authSchema.sessions.tokenVersion).toBeDefined();
  });

  test('sessions include last activity for server-side idle timeout', () => {
    expect(authSchema.sessions.lastActivityAt).toBeDefined();
  });

  test('sessions include explicit step-up authentication state', () => {
    expect(authSchema.sessions.stepUpAuthenticatedAt).toBeDefined();
  });

  test('sessions include login method for admin session visibility', () => {
    expect(authSchema.sessions.loginMethod).toBeDefined();
  });

  test('two factor records include verification state', () => {
    expect(authSchema.twoFactors.verified).toBeDefined();
  });

  test('passkey records include WebAuthn credential fields', () => {
    expect(authSchema.passkeys.publicKey).toBeDefined();
    expect(authSchema.passkeys.credentialID).toBeDefined();
    expect(authSchema.passkeys.counter).toBeDefined();
    expect(authSchema.passkeys.deviceType).toBeDefined();
    expect(authSchema.passkeys.backedUp).toBeDefined();
    expect(authSchema.passkeys.userId).toBeDefined();
  });
});
