import { Elysia } from 'elysia';
import { eq } from 'drizzle-orm';
import { resolveMfaTrustDeviceSeconds } from '@workspace/auth/mfa-config';
import { twoFactors } from '@workspace/db/auth-schema';
import { env } from '@workspace/env';
import { db } from '../../db';
import { authMacro } from './macro';
import { buildMfaFactorSummary } from './mfa-factors';

export const mfaController = new Elysia({
  name: 'auth.mfa.controller',
  prefix: '/auth/mfa',
})
  .use(authMacro)
  .get(
    '/factors',
    async ({ session }) => {
      const [factor] = await db
        .select({
          id: twoFactors.id,
          verified: twoFactors.verified,
          backupCodes: twoFactors.backupCodes,
        })
        .from(twoFactors)
        .where(eq(twoFactors.userId, session.userId))
        .limit(1);

      return buildMfaFactorSummary(factor, {
        trustDeviceMaxAgeSeconds: resolveMfaTrustDeviceSeconds(
          env.AUTH_MFA_TRUST_DEVICE_SECONDS,
        ),
      });
    },
    {
      isSignIn: true,
    },
  );
