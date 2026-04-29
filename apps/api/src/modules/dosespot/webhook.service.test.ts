import { describe, expect, it } from 'bun:test';
import { DoseSpotWebhookService } from './webhook.service';
import { dosespotConfig } from '@workspace/dosespot/utils';

describe('DoseSpotWebhookService Helpers', () => {
  it('computeDedupeKey should return deterministic hash of payload', () => {
    const service = new DoseSpotWebhookService({} as any, {} as any);
    const payload = { EventType: 'PrescriptionResult', Data: { id: 123 } };

    // @ts-ignore - testing private method
    const key1 = service.computeDedupeKey(payload);
    // @ts-ignore
    const key2 = service.computeDedupeKey(payload);

    expect(key1).toBeDefined();
    expect(key1).toBe(key2);
  });

  it('verifySignature should return true for valid secret match', () => {
    dosespotConfig.webhookSecret = 'my-secret';
    const service = new DoseSpotWebhookService({} as any, {} as any);

    expect(service.verifySignature('Secret my-secret')).toBe(true);
    expect(service.verifySignature('Secret wrong')).toBe(false);
    expect(service.verifySignature('')).toBe(false);
  });
});
