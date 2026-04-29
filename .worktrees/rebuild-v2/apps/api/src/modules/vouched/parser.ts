import { Value } from '@sinclair/typebox/value';
import type { VouchedPayload } from './helpers';
import { VouchedWebhookPayload } from './model';

const checkPayload = Value.Check;

export const parseVouchedWebhookBody = (rawBody: string): VouchedPayload => {
  let payload: unknown;

  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error('Invalid Vouched webhook payload');
  }

  if (!checkPayload(VouchedWebhookPayload, payload)) {
    throw new Error('Invalid Vouched webhook payload');
  }

  return payload as VouchedPayload;
};
