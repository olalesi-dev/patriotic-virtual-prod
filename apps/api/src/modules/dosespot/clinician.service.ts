import { eq } from 'drizzle-orm';
import * as schema from '@workspace/db';
import type { Db } from '@workspace/db';
import {
  doseSpotApiFetch,
  ensureDoseSpotResultOk,
  type DoseSpotResult,
} from '@workspace/dosespot';

export type DoseSpotClinicianReadinessStatus =
  | 'not_started'
  | 'agreements_pending'
  | 'clinician_confirmation_pending'
  | 'idp_pending'
  | 'idp_questions'
  | 'otp_required'
  | 'tfa_pending'
  | 'pin_reset_required'
  | 'locked'
  | 'ready';

export interface DoseSpotLegalAgreement {
  agreementId: string;
  title: string;
  accepted: boolean;
  acceptedAt: string | null;
  version: string | null;
}

export interface DoseSpotIdpQuestion {
  questionId: string;
  prompt: string;
  options: { optionId: string; label: string }[];
}

export interface DoseSpotIdpDisclaimer {
  title: string | null;
  body: string | null;
  version: string | null;
}

export interface DoseSpotClinicianReadiness {
  clinicianUid: string;
  clinicianId: number | null;
  readinessStatus: DoseSpotClinicianReadinessStatus;
  clinicianConfirmed: boolean | null;
  accountLocked: boolean;
  agreementsAccepted: boolean;
  legalAgreements: DoseSpotLegalAgreement[];
  idp: {
    initializedAt: string | null;
    disclaimerAccepted: boolean;
    disclaimerAcceptedAt: string | null;
    status: string | null;
    pendingQuestionsCount: number;
    questions: DoseSpotIdpQuestion[];
    otpRequired: boolean;
    completedAt: string | null;
    disclaimer: DoseSpotIdpDisclaimer | null;
  };
  tfa: {
    enabled: boolean;
    activatedAt: string | null;
    deactivatedAt: string | null;
  };
  pin: {
    resetRequired: boolean;
    lastResetAt: string | null;
  };
  lastEventType: string | null;
  lastEventAt: string | null;
  lastOperation: string | null;
  lastError: string | null;
}

export class DoseSpotClinicianService {
  constructor(private readonly db: Db) {}

  async getReadiness(clinicianUid: string): Promise<DoseSpotClinicianReadiness> {
    const provider = await this.requireProvider(clinicianUid);
    const storedState = (provider.doseSpotData as any) || {};

    const readiness = this.normalizeReadiness(
      clinicianUid,
      provider.doseSpotClinicianId ? Number(provider.doseSpotClinicianId) : null,
      storedState,
    );

    return readiness;
  }

  async syncClinician(clinicianUid: string) {
    const provider = await this.requireProvider(clinicianUid);
    if (provider.doseSpotClinicianId) {
      return { success: true, clinicianId: provider.doseSpotClinicianId };
    }

    // This would ideally fetch from a more complete profile
    const payload = {
      FirstName: provider.firstName,
      LastName: provider.lastName,
      // ... more fields from old backend buildDoseSpotClinicianPayload
    };

    // Placeholder for actual sync logic which requires many demographic fields
    throw new Error('Full clinician sync requires complete demographic profile.');
  }

  async fetchLegalAgreements(clinicianUid: string) {
    const provider = await this.requireClinicianId(clinicianUid);
    const response = await doseSpotApiFetch<any>(
      `api/clinicians/${provider.clinicianId}/legalAgreements`,
      { onBehalfOfClinicianId: provider.clinicianId },
    );

    const agreements = this.normalizeLegalAgreements(response);
    const current = await this.getReadiness(clinicianUid);
    const updated = this.updateReadinessFromAgreements(
      current,
      agreements,
      'legal_agreements.fetch',
    );
    await this.persistReadiness(clinicianUid, updated);

    return { agreements, readiness: updated };
  }

  async acceptLegalAgreement(clinicianUid: string, agreementId: string) {
    const provider = await this.requireClinicianId(clinicianUid);
    const response = await doseSpotApiFetch<any>('api/clinicians/acceptAgreement', {
      method: 'POST',
      body: { ClinicianId: provider.clinicianId, AgreementId: agreementId },
      onBehalfOfClinicianId: provider.clinicianId,
    });

    ensureDoseSpotResultOk(response.Result, 'accept agreement');

    // Refresh and return
    return await this.fetchLegalAgreements(clinicianUid);
  }

  async initIdp(clinicianUid: string) {
    const provider = await this.requireClinicianId(clinicianUid);
    const response = await doseSpotApiFetch<any>(
      `api/clinicians/${provider.clinicianId}/idpInit`,
      { onBehalfOfClinicianId: provider.clinicianId },
    );

    const current = await this.getReadiness(clinicianUid);
    const updated = this.updateReadinessFromIdpResponse(current, response, 'idp.init');
    await this.persistReadiness(clinicianUid, updated);

    return { readiness: updated, questions: updated.idp.questions };
  }

  private async requireProvider(userId: string) {
    const [provider] = await this.db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.userId, userId))
      .limit(1);

    if (!provider) throw new Error('Provider profile not found');
    return provider;
  }

  private async requireClinicianId(userId: string) {
    const provider = await this.requireProvider(userId);
    if (!provider.doseSpotClinicianId) {
      throw new Error('Provider not linked to DoseSpot');
    }
    return { ...provider, clinicianId: Number(provider.doseSpotClinicianId) };
  }

  private async persistReadiness(userId: string, readiness: DoseSpotClinicianReadiness) {
    await this.db
      .update(schema.providers)
      .set({
        doseSpotData: readiness as any,
        updatedAt: new Date(),
      })
      .where(eq(schema.providers.userId, userId));
  }

  private normalizeReadiness(
    uid: string,
    id: number | null,
    stored: any,
  ): DoseSpotClinicianReadiness {
    // Ported from normalizeStoredReadiness
    const agreements = Array.isArray(stored.legalAgreements) ? stored.legalAgreements : [];
    const idp = stored.idp || {};
    const tfa = stored.tfa || {};
    const pin = stored.pin || {};

    const readiness: DoseSpotClinicianReadiness = {
      clinicianUid: uid,
      clinicianId: id,
      readinessStatus: 'not_started',
      clinicianConfirmed: !!stored.clinicianConfirmed,
      accountLocked: !!stored.accountLocked,
      agreementsAccepted: !!stored.agreementsAccepted || (agreements.length > 0 && agreements.every((a: any) => a.accepted)),
      legalAgreements: agreements,
      idp: {
        initializedAt: idp.initializedAt || null,
        disclaimerAccepted: !!idp.disclaimerAccepted,
        disclaimerAcceptedAt: idp.disclaimerAcceptedAt || null,
        status: idp.status || null,
        pendingQuestionsCount: idp.pendingQuestionsCount || 0,
        questions: idp.questions || [],
        otpRequired: !!idp.otpRequired,
        completedAt: idp.completedAt || null,
        disclaimer: idp.disclaimer || null,
      },
      tfa: {
        enabled: !!tfa.enabled,
        activatedAt: tfa.activatedAt || null,
        deactivatedAt: tfa.deactivatedAt || null,
      },
      pin: {
        resetRequired: !!pin.resetRequired,
        lastResetAt: pin.lastResetAt || null,
      },
      lastEventType: stored.lastEventType || null,
      lastEventAt: stored.lastEventAt || null,
      lastOperation: stored.lastOperation || null,
      lastError: stored.lastError || null,
    };

    readiness.readinessStatus = this.deriveReadinessStatus(readiness);
    return readiness;
  }

  private deriveReadinessStatus(r: DoseSpotClinicianReadiness): DoseSpotClinicianReadinessStatus {
    if (r.accountLocked) return 'locked';
    if (!r.agreementsAccepted) return 'agreements_pending';
    if (!r.clinicianConfirmed) return 'clinician_confirmation_pending';
    if (!r.idp.completedAt) {
      if (r.idp.otpRequired) return 'otp_required';
      if (r.idp.questions.length > 0) return 'idp_questions';
      return 'idp_pending';
    }
    if (!r.tfa.enabled) return 'tfa_pending';
    if (r.pin.resetRequired) return 'pin_reset_required';
    return 'ready';
  }

  private normalizeLegalAgreements(response: any): DoseSpotLegalAgreement[] {
    const items = Array.isArray(response.Items) ? response.Items : [];
    return items.map((i: any) => ({
      agreementId: i.AgreementId?.toString(),
      title: i.Title,
      accepted: !!i.Accepted,
      acceptedAt: i.AcceptedAt || null,
      version: i.Version || null,
    }));
  }

  private updateReadinessFromAgreements(
    r: DoseSpotClinicianReadiness,
    agreements: DoseSpotLegalAgreement[],
    op: string,
  ): DoseSpotClinicianReadiness {
    const accepted = agreements.length > 0 ? agreements.every((a) => a.accepted) : r.agreementsAccepted;
    return {
      ...r,
      agreementsAccepted: accepted,
      legalAgreements: agreements.length > 0 ? agreements : r.legalAgreements,
      lastOperation: op,
      readinessStatus: this.deriveReadinessStatus({ ...r, agreementsAccepted: accepted }),
    };
  }

  private updateReadinessFromIdpResponse(
    r: DoseSpotClinicianReadiness,
    response: any,
    op: string,
  ): DoseSpotClinicianReadiness {
    // Simplified IDP update logic
    const questions = Array.isArray(response.Questions) ? response.Questions.map((q: any) => ({
        questionId: q.QuestionId?.toString(),
        prompt: q.Prompt,
        options: (q.Options || []).map((o: any) => ({ optionId: o.OptionId?.toString(), label: o.Label }))
    })) : [];
    
    const now = new Date().toISOString();
    const updated = {
        ...r,
        idp: {
            ...r.idp,
            initializedAt: op === 'idp.init' ? now : r.idp.initializedAt,
            questions,
            pendingQuestionsCount: questions.length,
            status: questions.length > 0 ? 'questions_pending' : r.idp.status,
        },
        lastOperation: op
    };
    updated.readinessStatus = this.deriveReadinessStatus(updated);
    return updated;
  }
}
