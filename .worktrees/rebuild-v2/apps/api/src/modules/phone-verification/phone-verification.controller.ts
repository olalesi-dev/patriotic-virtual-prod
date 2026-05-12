import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { getPhoneVerificationErrorStatus } from './errors';
import { startPhoneVerification, verifyPhoneCode } from './service';

export const phoneVerificationController = new Elysia({
  prefix: '/v1/phone-verification',
})
  .use(authMacro)
  .post(
    '/request',
    async ({ body, user, set }) => {
      try {
        const verification = await startPhoneVerification(
          user.id,
          body.phoneNumber,
        );
        return { success: true, verification };
      } catch (error) {
        set.status = getPhoneVerificationErrorStatus(error);
        return {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to start phone verification.',
        };
      }
    },
    {
      isSignIn: true,
      body: t.Object({
        phoneNumber: t.Optional(t.String({ minLength: 7 })),
      }),
      detail: {
        summary: 'Request Phone Verification Code',
        tags: ['Phone Verification'],
      },
    },
  )
  .post(
    '/verify',
    async ({ body, user, set }) => {
      try {
        const verification = await verifyPhoneCode(
          user.id,
          body.phoneNumber,
          body.code,
        );
        return { success: true, verification };
      } catch (error) {
        set.status = getPhoneVerificationErrorStatus(error);
        return {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to verify phone number.',
        };
      }
    },
    {
      isSignIn: true,
      body: t.Object({
        phoneNumber: t.String({ minLength: 7 }),
        code: t.String({ minLength: 3, maxLength: 10 }),
      }),
      detail: {
        summary: 'Verify Phone Code',
        tags: ['Phone Verification'],
      },
    },
  );
