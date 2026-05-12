import { describe, expect, it } from 'bun:test';
import {
  extractSessionIdFromAuthContext,
  resolveLoginMethodFromAuthPath,
} from './session-login-method';

describe('session login method tracking', () => {
  it('maps Better Auth login routes to stable method labels', () => {
    expect(resolveLoginMethodFromAuthPath('/sign-in/email')).toBe('password');
    expect(resolveLoginMethodFromAuthPath('/email-otp/verify-email')).toBe(
      'email_otp',
    );
    expect(resolveLoginMethodFromAuthPath('/phone-number/verify')).toBe(
      'sms_otp',
    );
    expect(resolveLoginMethodFromAuthPath('/magic-link/verify')).toBe(
      'magic_link',
    );
    expect(
      resolveLoginMethodFromAuthPath('/passkey/verify-authentication'),
    ).toBe('passkey');
    expect(resolveLoginMethodFromAuthPath('/two-factor/verify-totp')).toBe(
      'totp',
    );
    expect(resolveLoginMethodFromAuthPath('/not-auth')).toBeUndefined();
  });

  it('extracts session ids from supported Better Auth hook shapes', () => {
    expect(
      extractSessionIdFromAuthContext({
        session: { session: { id: 'session-from-current' } },
      }),
    ).toBe('session-from-current');

    expect(
      extractSessionIdFromAuthContext({
        newSession: { id: 'session-from-new-session' },
      }),
    ).toBe('session-from-new-session');

    expect(
      extractSessionIdFromAuthContext({
        returned: { session: { session: { id: 'session-from-returned' } } },
      }),
    ).toBe('session-from-returned');

    expect(extractSessionIdFromAuthContext({ returned: {} })).toBeUndefined();
  });
});
