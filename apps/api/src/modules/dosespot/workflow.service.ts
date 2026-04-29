import { eq } from 'drizzle-orm';
import * as schema from '@workspace/db';
import type { Db } from '@workspace/db';
import {
  doseSpotApiFetch,
  ensureDoseSpotResultOk,
} from '@workspace/dosespot';

export class DoseSpotWorkflowService {
  constructor(private readonly db: Db) {}

  async getMedicationHistory(userId: string, patientId: string) {
    const { clinicianId, patientDoseSpotId } = await this.requireContext(userId, patientId);

    const response = await doseSpotApiFetch<any>(
      `api/patients/${patientDoseSpotId}/medications/history`,
      { onBehalfOfClinicianId: clinicianId },
    );

    return {
      items: response.Items || [],
      pageResult: response.PageResult,
    };
  }

  async setMedicationHistoryConsent(userId: string, patientId: string, consent: boolean) {
    const { clinicianId, patientDoseSpotId } = await this.requireContext(userId, patientId);

    const response = await doseSpotApiFetch<any>(
      `api/patients/${patientDoseSpotId}/medications/history/consent`,
      {
        method: 'POST',
        body: { Consent: consent },
        onBehalfOfClinicianId: clinicianId,
      },
    );

    ensureDoseSpotResultOk(response.Result, 'set medication history consent');
    return { success: true };
  }

  async getPrescriptionSummary(userId: string, patientId: string) {
    const { clinicianId, patientDoseSpotId } = await this.requireContext(userId, patientId);

    const response = await doseSpotApiFetch<any>(
      `api/patients/${patientDoseSpotId}/prescriptions`,
      { onBehalfOfClinicianId: clinicianId },
    );

    return {
      items: response.Items || [],
      pageResult: response.PageResult,
    };
  }

  private async requireContext(userId: string, patientId: string) {
    const [provider] = await this.db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.userId, userId))
      .limit(1);

    if (!provider || !provider.doseSpotClinicianId) {
      throw new Error('Provider not linked to DoseSpot');
    }

    const [patient] = await this.db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, patientId))
      .limit(1);

    if (!patient || !patient.doseSpotPatientId) {
      throw new Error('Patient not linked to DoseSpot');
    }

    return {
      clinicianId: Number(provider.doseSpotClinicianId),
      patientDoseSpotId: Number(patient.doseSpotPatientId),
    };
  }
}
