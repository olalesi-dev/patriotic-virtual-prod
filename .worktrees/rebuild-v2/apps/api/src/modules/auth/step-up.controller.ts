import { Elysia, t } from 'elysia';
import { markSessionStepUpAuthenticated } from '@workspace/auth/session-security';
import { db } from '../../db';
import { ForbiddenException } from '../../utils/errors';
import { authMacro } from './macro';
import { verifyPasswordForStepUp } from './step-up';

export const stepUpController = new Elysia({
  name: 'auth.step-up.controller',
  prefix: '/auth/session',
})
  .use(authMacro)
  .post(
    '/step-up/password',
    async ({ body, session }) => {
      const verified = await verifyPasswordForStepUp(
        db as never,
        session.userId,
        body.password,
      );

      if (!verified) {
        throw new ForbiddenException('Step-up authentication failed');
      }

      await markSessionStepUpAuthenticated(db as never, session);

      return {
        verified: true,
        method: 'password',
      };
    },
    {
      isSignIn: true,
      body: t.Object({
        password: t.String({ minLength: 1 }),
      }),
      detail: {
        summary: 'Confirm password for step-up authentication',
        tags: ['Auth'],
      },
    },
  );
