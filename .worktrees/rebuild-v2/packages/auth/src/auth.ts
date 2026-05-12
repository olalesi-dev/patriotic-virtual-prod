import { betterAuth } from 'better-auth';
import { passkey } from '@better-auth/passkey';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  twoFactor,
  admin,
  emailOTP,
  magicLink,
  phoneNumber,
} from 'better-auth/plugins';
import { env } from '@workspace/env/index';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@workspace/db/schema';
import * as authSchema from '@workspace/db/auth-schema';
import { sendWelcomeEmailForCreatedUser } from './email-hooks';
import {
  getLoginLockoutStateByEmail,
  isInvalidCredentialsResponse,
  isLoginLocked,
  isSuccessfulSignInResponse,
  normalizeLoginEmail,
  recordFailedLoginAttempt,
  resetLoginFailures,
} from './login-lockout';
import {
  buildEmailOtpPluginOptions,
  buildMagicLinkPluginOptions,
  buildPasskeyPluginOptions,
  buildPhoneNumberPluginOptions,
  buildTwoFactorPluginOptions,
  parsePositiveInteger,
} from './mfa-config';
import {
  isLikelyE164PhoneNumber,
  sendAuthEmailOtp,
  sendAuthSmsOtp,
  sendMagicLinkEmail,
  sendTwoFactorEmailOtp,
} from './mfa-delivery';
import { getUserPermissionsAndModules } from './permissions';
import { revokeUserAuth } from './session-security';
import {
  LOGIN_METHOD_UNKNOWN,
  extractSessionIdFromAuthContext,
  markSessionLoginMethod,
  resolveLoginMethodFromAuthPath,
} from './session-login-method';

const defaultAuthBaseUrl = 'https://patriotic-virtual-emr.web.app';
const authBaseUrl =
  process.env.BETTER_AUTH_URL?.trim() ||
  env.APP_URL?.trim() ||
  defaultAuthBaseUrl;

const connection = postgres(
  env.DATABASE_URL?.trim()
    ? env.DATABASE_URL
    : 'postgres://dummy:dummy@localhost/dummy',
);
const db = drizzle(connection, {
  schema: {
    ...schema,
    ...authSchema,
  },
});

const trustedOrigins = [
  env.APP_URL,
  ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : []),
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

const sessionConfig = {
  // Defaults are staff-oriented: one workday max age, periodic refresh while active,
  // And five-minute freshness for security-sensitive Better Auth operations.
  expiresIn: parsePositiveInteger(
    env.AUTH_SESSION_EXPIRES_IN_SECONDS,
    60 * 60 * 8,
  ),
  updateAge: parsePositiveInteger(env.AUTH_SESSION_UPDATE_AGE_SECONDS, 60 * 15),
  freshAge: parsePositiveInteger(env.AUTH_SESSION_FRESH_AGE_SECONDS, 60 * 5),
};

const loginLockoutConfig = {
  maxAttempts: parsePositiveInteger(env.AUTH_LOGIN_LOCKOUT_MAX_ATTEMPTS, 5),
  lockoutSeconds: parsePositiveInteger(env.AUTH_LOGIN_LOCKOUT_SECONDS, 60 * 15),
};

const twoFactorOptions = buildTwoFactorPluginOptions({
  totpIssuer: env.AUTH_TOTP_ISSUER,
  trustDeviceSeconds: env.AUTH_MFA_TRUST_DEVICE_SECONDS,
  sendTwoFactorOtp: sendTwoFactorEmailOtp,
});

const emailOtpOptions = buildEmailOtpPluginOptions({
  expiresSeconds: env.AUTH_EMAIL_OTP_EXPIRES_SECONDS,
  allowedAttempts: env.AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS,
  sendVerificationOTP: sendAuthEmailOtp,
});

const magicLinkOptions = buildMagicLinkPluginOptions({
  expiresSeconds: env.AUTH_MAGIC_LINK_EXPIRES_SECONDS,
  allowedAttempts: env.AUTH_MAGIC_LINK_ALLOWED_ATTEMPTS,
  sendMagicLink: sendMagicLinkEmail,
});

const phoneNumberOptions = buildPhoneNumberPluginOptions({
  expiresSeconds: env.AUTH_SMS_OTP_EXPIRES_SECONDS,
  allowedAttempts: env.AUTH_SMS_OTP_ALLOWED_ATTEMPTS,
  sendOTP: sendAuthSmsOtp,
  sendPasswordResetOTP: sendAuthSmsOtp,
  phoneNumberValidator: isLikelyE164PhoneNumber,
});

const passkeyOptions = buildPasskeyPluginOptions({
  rpName: env.AUTH_PASSKEY_RP_NAME,
  rpId: env.AUTH_PASSKEY_RP_ID,
  origin: env.AUTH_PASSKEY_ORIGIN,
  baseUrl: authBaseUrl,
});

export const auth = betterAuth({
  baseURL: authBaseUrl,
  trustedOrigins,
  session: sessionConfig,
  advanced: {
    useSecureCookies: env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: authSchema.sessions,
      account: authSchema.accounts,
      verification: authSchema.verifications,
      twoFactor: authSchema.twoFactors,
      passkey: authSchema.passkeys,
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
    revokeSessionsOnPasswordReset: true,
    onPasswordReset: async ({ user }) => {
      await revokeUserAuth(db as never, user.id, 'password_reset');
    },
    password: {
      hash: async (password: string) =>
        await Bun.password.hash(password, 'argon2id'),
      verify: async ({ password, hash }: { password: string; hash: string }) =>
        await Bun.password.verify(password, hash),
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
          const { role, permissions, allowedModules, tokenVersion } =
            await getUserPermissionsAndModules(db, session.userId);
          return {
            data: {
              ...session,
              tokenVersion,
              role,
              permissions,
              allowedModules,
              loginMethod: LOGIN_METHOD_UNKNOWN,
            },
          };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/email') {
        return;
      }

      const email = normalizeLoginEmail(
        (ctx.body as { email?: unknown })?.email,
      );
      if (!email) {
        return;
      }

      const lockoutState = await getLoginLockoutStateByEmail(
        db as never,
        email,
      );
      if (!isLoginLocked(lockoutState)) {
        return;
      }

      throw new APIError('LOCKED', {
        code: 'ACCOUNT_LOCKED',
        message: 'Account temporarily locked. Try again later.',
      });
    }),
    after: createAuthMiddleware(async (ctx) => {
      const loginMethod = resolveLoginMethodFromAuthPath(ctx.path);
      if (loginMethod) {
        const sessionId = extractSessionIdFromAuthContext(ctx.context);
        if (sessionId) {
          await markSessionLoginMethod(db as never, sessionId, loginMethod);
        }
      }

      if (ctx.path === '/sign-in/email') {
        const email = normalizeLoginEmail(
          (ctx.body as { email?: unknown })?.email,
        );
        const response = (ctx.context as { returned?: unknown }).returned;

        if (email && isInvalidCredentialsResponse(response)) {
          await recordFailedLoginAttempt(
            db as never,
            email,
            loginLockoutConfig,
          );
        } else if (email && isSuccessfulSignInResponse(response)) {
          await resetLoginFailures(db as never, email);
        }
      }

      if (!['/change-password', '/set-password'].includes(ctx.path)) {
        return;
      }

      const session = (ctx.context as any).session?.session;
      const userId = session?.userId;
      if (!userId) {
        return;
      }

      await revokeUserAuth(db as never, userId, 'password_change', {
        exceptSessionId: session.id,
      });
    }),
  },
  plugins: [
    emailOTP(emailOtpOptions),
    magicLink(magicLinkOptions),
    phoneNumber(phoneNumberOptions),
    twoFactor(twoFactorOptions),
    passkey(passkeyOptions),
    admin(),
  ],
});
