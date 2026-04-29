import { describe, expect, it } from 'bun:test';
import { DoseSpotClinicianService } from './clinician.service';

describe('DoseSpotClinicianService Helpers', () => {
  const service = new DoseSpotClinicianService({} as any);

  it('deriveReadinessStatus should return ready when all steps complete', () => {
    const readiness: any = {
      accountLocked: false,
      agreementsAccepted: true,
      clinicianConfirmed: true,
      idp: { completedAt: '2026-01-01' },
      tfa: { enabled: true },
      pin: { resetRequired: false }
    };
    // @ts-ignore
    expect(service.deriveReadinessStatus(readiness)).toBe('ready');
  });

  it('deriveReadinessStatus should return agreements_pending when agreements not accepted', () => {
    const readiness: any = {
      accountLocked: false,
      agreementsAccepted: false,
      clinicianConfirmed: true,
      idp: { completedAt: '2026-01-01' },
      tfa: { enabled: true },
      pin: { resetRequired: false }
    };
    // @ts-ignore
    expect(service.deriveReadinessStatus(readiness)).toBe('agreements_pending');
  });

  it('deriveReadinessStatus should return idp_questions when questions pending', () => {
    const readiness: any = {
      accountLocked: false,
      agreementsAccepted: true,
      clinicianConfirmed: true,
      idp: { completedAt: null, questions: [{}] },
      tfa: { enabled: true },
      pin: { resetRequired: false }
    };
    // @ts-ignore
    expect(service.deriveReadinessStatus(readiness)).toBe('idp_questions');
  });
});
