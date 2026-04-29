import { dosespotRepository } from '@workspace/db/repositories/dosespot.repository';
import { dosespotWebhookEvents } from '@workspace/db/schema';
import type { Db } from '@workspace/db/index';
import { env } from '@workspace/env/index';
import { createHash } from 'node:crypto';
import { getPrescription } from '@workspace/dosespot/api';
import { dosespotConfig } from '@workspace/dosespot/utils';
import { eq } from 'drizzle-orm';
import { NotificationProducers } from '@workspace/notifications/producers';

export class DoseSpotWebhookService {
  private readonly repo: ReturnType<typeof dosespotRepository>;

  constructor(
    private readonly db: Db,
    private readonly producers: NotificationProducers,
  ) {
    this.repo = dosespotRepository(db);
  }

  async ingestWebhook(
    payload: Record<string, any>,
    headers: Record<string, string | undefined>,
  ) {
    const eventType = payload.EventType || 'Unknown';
    const dedupeKey = this.computeDedupeKey(payload);

    const existing = await this.repo.findWebhookEventByDedupeKey(dedupeKey);
    if (existing) {
      return { id: existing.id, status: 'duplicate' };
    }

    const event = await this.repo.createWebhookEvent({
      dedupeKey,
      eventType,
      payload,
      status: 'pending',
      receivedAt: new Date(),
    });

    return { id: event.id, status: 'created' };
  }

  async processEvent(eventId: string) {
    const [event] = await this.db
      .select()
      .from(dosespotWebhookEvents)
      .where(eq(dosespotWebhookEvents.id, eventId))
      .limit(1);

    if (!event || event.status !== 'pending') return;

    await this.repo.updateWebhookEvent(eventId, { status: 'processing' });

    try {
      const payload = event.payload as Record<string, any>;
      const data = payload.Data || payload;

      if (
        event.eventType === 'PrescriptionResult' ||
        event.eventType === 'MedicationStatusUpdate'
      ) {
        const doseSpotPrescriptionId =
          data.PrescriptionId || data.PrescriptionID;
        const doseSpotPatientId = data.PatientId || data.PatientID;

        if (doseSpotPrescriptionId) {
          const patient = await this.repo.findPatientByDoseSpotId(
            doseSpotPatientId.toString(),
          );
          if (!patient)
            throw new Error(`Patient not found: ${doseSpotPatientId}`);

          // Fetch full details from DoseSpot
          const dsPrescription = await getPrescription(
            Number(doseSpotPrescriptionId),
          );

          if (dsPrescription) {
            const statusLabel = this.getPrescriptionStatusLabel(dsPrescription);
            await this.repo.upsertPrescription({
              doseSpotPrescriptionId: Number(doseSpotPrescriptionId),
              patientId: patient.id,
              providerId: patient.organizationId, // Fallback, should ideally be the actual provider
              medicationName: dsPrescription.MedicationName,
              dosage: dsPrescription.Dosage,
              quantity: dsPrescription.Quantity,
              refills: dsPrescription.Refills ?? 0,
              status: statusLabel,
              lastStatusUpdate: new Date(),
            });

            // Trigger Notifications
            if (statusLabel === 'Sent') {
              await this.producers.notifyPrescriptionSent({
                patientId: patient.id,
                medicationName: dsPrescription.MedicationName,
                prescriptionId: doseSpotPrescriptionId.toString(),
              });
            } else if (statusLabel === 'Transmission Error') {
              await this.producers.notifyPrescriptionError({
                patientName: `${patient.firstName} ${patient.lastName}`,
                medicationName: dsPrescription.MedicationName,
                errorDetails:
                  dsPrescription.StatusDetails || 'Unknown error from DoseSpot',
                prescriptionId: doseSpotPrescriptionId.toString(),
              });
            }
          }
        }
      }

      await this.repo.updateWebhookEvent(eventId, {
        status: 'success',
        processedAt: new Date(),
      });
    } catch (error: any) {
      await this.repo.updateWebhookEvent(eventId, {
        status: 'failed',
        errorMessage: error.message,
      });
      throw error;
    }
  }

  private getPrescriptionStatusLabel(data: any): string {
    const details = (data.StatusDetails || '').toLowerCase();
    if (
      details.includes('error') ||
      details.includes('fail') ||
      details.includes('unable') ||
      details.includes('reject') ||
      details.includes('denied')
    ) {
      return 'Transmission Error';
    }
    if (details.includes('filled')) return 'Filled';
    if (details.includes('sent') || details.includes('pharmacy')) return 'Sent';
    if (details.includes('pending') || details.includes('queued'))
      return 'In Progress';

    const status = data.PrescriptionStatus;
    if (status === 13) return 'Transmission Error';
    return 'Sent';
  }

  private computeDedupeKey(payload: Record<string, any>): string {
    const basis = JSON.stringify(payload);
    return createHash('sha256').update(basis).digest('hex');
  }

  verifySignature(authHeader?: string): boolean {
    const secret = dosespotConfig.webhookSecret;
    if (!secret) return true;
    if (!authHeader) return false;
    return authHeader === `Secret ${secret}`;
  }
}
