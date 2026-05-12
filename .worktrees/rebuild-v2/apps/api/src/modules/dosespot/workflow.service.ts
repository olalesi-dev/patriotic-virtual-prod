import { eq } from 'drizzle-orm';
import * as schema from '@workspace/db/schema';
import type { Db } from '@workspace/db/index';
import {
  doseSpotApiFetch,
  ensureDoseSpotResultOk,
} from '@workspace/dosespot/api';

export class DoseSpotWorkflowService {
  constructor(private readonly db: Db) {}

  async getMedicationHistory(
    userId: string,
    patientId: string,
    options: {
      start?: string;
      end?: string;
      pageNumber?: number;
      onBehalfOfClinicianId?: number;
    } = {},
  ) {
    const { clinicianId, patientDoseSpotId } = await this.requireContext(
      userId,
      patientId,
      options.onBehalfOfClinicianId,
    );

    const query = new URLSearchParams();
    if (options.start) {query.set('start', options.start);}
    if (options.end) {query.set('end', options.end);}
    if (options.pageNumber) {query.set('pageNumber', String(options.pageNumber));}
    const suffix = query.size > 0 ? `?${query.toString()}` : '';

    const response = await doseSpotApiFetch<any>(
      `api/patients/${patientDoseSpotId}/medications/history${suffix}`,
      { onBehalfOfClinicianId: clinicianId },
    );

    return {
      patientUid: patientId,
      doseSpotPatientId: patientDoseSpotId,
      status: 'linked_existing',
      syncStatus: 'ready',
      message: 'Data loaded.',
      items: response.Items || [],
      pageResult: response.PageResult || null,
      result: response.Result || null,
    };
  }

  async setMedicationHistoryConsent(
    userId: string,
    patientId: string,
    consent = true,
    options: { onBehalfOfClinicianId?: number } = {},
  ) {
    const { clinicianId, patientDoseSpotId } = await this.requireContext(
      userId,
      patientId,
      options.onBehalfOfClinicianId,
    );

    const response = await doseSpotApiFetch<any>(
      `api/patients/${patientDoseSpotId}/medications/history/consent`,
      {
        method: 'POST',
        body: { Consent: consent },
        onBehalfOfClinicianId: clinicianId,
      },
    );

    ensureDoseSpotResultOk(response.Result, 'set medication history consent');
    return {
      patientUid: patientId,
      doseSpotPatientId: patientDoseSpotId,
      status: 'linked_existing',
      syncStatus: 'ready',
      message: 'Medication history consent logged.',
      result: response.Result || null,
      success: true,
    };
  }

  async getPrescriptionSummary(
    userId: string,
    patientId: string,
    options: {
      startDate?: string;
      endDate?: string;
      pageNumber?: number;
      statusClass?: 'Active' | 'Inactive' | 'Pending';
      prescriptionStatus?: string;
      onBehalfOfClinicianId?: number;
    } = {},
  ) {
    const { clinicianId, patientDoseSpotId } = await this.requireContext(
      userId,
      patientId,
      options.onBehalfOfClinicianId,
    );

    const query = new URLSearchParams();
    if (options.startDate) {query.set('startDate', options.startDate);}
    if (options.endDate) {query.set('endDate', options.endDate);}
    if (options.pageNumber) {query.set('pageNumber', String(options.pageNumber));}
    if (options.statusClass) {query.set('statusClass', options.statusClass);}
    if (options.prescriptionStatus) {
      query.set('prescriptionStatus', options.prescriptionStatus);
    }
    const suffix = query.size > 0 ? `?${query.toString()}` : '';

    const response = await doseSpotApiFetch<any>(
      `api/patients/${patientDoseSpotId}/prescriptions${suffix}`,
      { onBehalfOfClinicianId: clinicianId },
    );

    const items = response.Items || [];

    return {
      patientUid: patientId,
      doseSpotPatientId: patientDoseSpotId,
      status: 'linked_existing',
      syncStatus: 'ready',
      message: 'Data loaded.',
      items,
      eligibility: this.buildEligibilitySummary(items),
      pageResult: response.PageResult || null,
      result: response.Result || null,
    };
  }

  async getPendingRefillsQueue(
    userId: string,
    options: {
      clinicId?: 'Current' | 'All';
      patientId?: string;
      pageNumber?: number;
      onBehalfOfClinicianId?: number;
    } = {},
  ) {
    const provider = await this.requireProvider(userId, options.onBehalfOfClinicianId);
    const clinicianId = options.onBehalfOfClinicianId ?? Number(provider.doseSpotClinicianId);
    const query = this.buildQueueQuery(options);

    const response = await doseSpotApiFetch<any>(
      `api/clinicians/${clinicianId}/queues/refills${query}`,
      { onBehalfOfClinicianId: clinicianId },
    );

    return {
      status: 'linked_existing',
      syncStatus: 'ready',
      message: 'Data loaded.',
      items: response.Items || [],
      pageResult: response.PageResult || null,
      totalItems: response.PageResult?.TotalItems ?? response.Items?.length ?? 0,
      result: response.Result || null,
    };
  }

  async getPendingRxChangesQueue(
    userId: string,
    options: {
      clinicId?: 'Current' | 'All';
      patientId?: string;
      pageNumber?: number;
      onBehalfOfClinicianId?: number;
    } = {},
  ) {
    const provider = await this.requireProvider(userId, options.onBehalfOfClinicianId);
    const clinicianId = options.onBehalfOfClinicianId ?? Number(provider.doseSpotClinicianId);
    const query = this.buildQueueQuery(options);

    const response = await doseSpotApiFetch<any>(
      `api/rxchanges/pending/detailed${query}`,
      { onBehalfOfClinicianId: clinicianId },
    );

    return {
      status: 'linked_existing',
      syncStatus: 'ready',
      message: 'Data loaded.',
      items: response.Items || [],
      pageResult: response.PageResult || null,
      totalItems: response.PageResult?.TotalItems ?? response.Items?.length ?? 0,
      result: response.Result || null,
    };
  }

  private async requireProvider(userId: string, fallbackClinicianId?: number) {
    const [provider] = await this.db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.userId, userId))
      .limit(1);

    if (!provider && fallbackClinicianId) {
      return { doseSpotClinicianId: String(fallbackClinicianId) };
    }

    if (!provider || (!provider.doseSpotClinicianId && !fallbackClinicianId)) {
      throw new Error('Provider not linked to DoseSpot');
    }
    return provider;
  }

  private async requireContext(
    userId: string,
    patientId: string,
    onBehalfOfClinicianId?: number,
  ) {
    const provider = await this.requireProvider(userId, onBehalfOfClinicianId);

    const [patient] = await this.db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, patientId))
      .limit(1);

    if (!patient || !patient.doseSpotPatientId) {
      throw new Error('Patient not linked to DoseSpot');
    }

    return {
      clinicianId: onBehalfOfClinicianId ?? Number(provider.doseSpotClinicianId),
      patientDoseSpotId: Number(patient.doseSpotPatientId),
    };
  }

  private buildQueueQuery(options: {
    clinicId?: 'Current' | 'All';
    patientId?: string;
    pageNumber?: number;
  }) {
    const query = new URLSearchParams();
    if (options.clinicId) {query.set('clinicId', options.clinicId);}
    if (options.patientId) {query.set('patientId', options.patientId);}
    if (options.pageNumber) {query.set('pageNumber', String(options.pageNumber));}
    return query.size > 0 ? `?${query.toString()}` : '';
  }

  private buildEligibilitySummary(items: Record<string, unknown>[]) {
    const totalWithEligibilityId = items.filter((item) =>
      Boolean(
        item.EligibilityId ??
          item.EligibilityID ??
          item.eligibilityId ??
          item.eligibilityID,
      ),
    ).length;

    return {
      totalItems: items.length,
      totalWithEligibilityId,
    };
  }
}
