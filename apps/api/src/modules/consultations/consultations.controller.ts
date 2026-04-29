import { Elysia, t } from 'elysia';
import { authMacro } from '../auth/macro';
import { db } from '../../db';
import * as schema from '@workspace/db';
import { createConsultation } from '../payments/consultation-payments.service';

export const consultationsController = new Elysia({
  prefix: '/consultations',
})
  .use(authMacro)
  .post(
    '/',
    async ({ body, user }) => {
      // For now, we assume the user belongs to the default organization
      // In a real multi-tenant app, we would resolve this from the user's profile
      const [defaultOrg] = await db.select().from(schema.organizations).limit(1);

      if (!defaultOrg) {
        throw new Error('No organization found. Run database seed.');
      }

      const result = await createConsultation({
        userId: user.id,
        serviceKey: body.serviceKey,
        intake: body.intake,
        organizationId: defaultOrg.id,
      });

      return {
        id: result.consultation.id,
        message: 'Consultation created',
      };
    },
    {
      isSignIn: true,
      body: t.Object({
        serviceKey: t.String(),
        intake: t.Record(t.String(), t.Any()),
        stripeProductId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
      detail: {
        summary: 'Create Intake Consultation',
        tags: ['Consultations'],
      },
    },
  );
