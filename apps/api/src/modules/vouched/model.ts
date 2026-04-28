/* eslint-disable new-cap */
import { Elysia, t } from 'elysia';

export const VouchedWebhookPayload = t.Object({
  id: t.String(),
  status: t.String(),
  request: t.Optional(
    t.Nullable(
      t.Object({
        properties: t.Optional(
          t.Nullable(
            t.Array(
              t.Object({
                name: t.String(),
                value: t.String(),
              }),
            ),
          ),
        ),
        parameters: t.Optional(
          t.Nullable(t.Record(t.String(), t.Unknown())),
        )
      }),
    ),
  ),
  result: t.Optional(
    t.Nullable(
      t.Object({
        success: t.Optional(t.Nullable(t.Boolean())),
        warnings: t.Optional(t.Nullable(t.Boolean())),
        error: t.Optional(
          t.Nullable(t.Union([t.Record(t.String(), t.Unknown()), t.String()])),
        ),
      }),
    ),
  ),
  errors: t.Optional(t.Nullable(t.Array(t.Unknown()))),
});

export const vouchedModel = new Elysia({ name: 'vouched.model' }).model({
  vouchedPayload: VouchedWebhookPayload,
});
