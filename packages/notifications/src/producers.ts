import { buildPortalUrl } from './links';
import { formatRequestedDate, getPlatformName } from './template-data';
import type { NotificationService } from './service';
import { notificationRepository, type Db } from '@workspace/db';

function asCurrency(amountInCents: number | null): string {
  if (amountInCents === null) return 'an outstanding balance';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountInCents / 100);
}

export class NotificationProducers {
  private readonly repo: ReturnType<typeof notificationRepository>;

  constructor(
    private readonly db: Db,
    private readonly service: NotificationService,
  ) {
    this.repo = notificationRepository(db);
  }

  async notifyPriorityQueuePaymentSuccess(input: {
    appointmentId: string;
    patientId?: string | null;
    patientName: string;
    serviceName: string;
    requestedAt?: Date | string | null;
    appointmentReason?: string | null;
  }): Promise<void> {
    const providers = await this.repo.findUsersByRoles([
      'provider',
      'doctor',
      'admin',
    ]);
    const platformName = getPlatformName();
    const requestedDate = formatRequestedDate(input.requestedAt ?? new Date());
    const appointmentReason =
      input.appointmentReason?.trim() || input.serviceName;

    if (input.patientId) {
      await this.service.notify({
        topicKey: 'PRIORITY_QUEUE_PAYMENT_SUCCESS_PATIENT',
        entityId: input.appointmentId,
        recipientIds: [input.patientId],
        dedupeKey: `priority-queue:patient:${input.appointmentId}:patient`,
        templateData: {
          recipient_type: 'patient',
          patient_name: input.patientName,
          requested_date: requestedDate,
          appointment_reason: appointmentReason,
          platform_name: platformName,
          patientName: input.patientName,
          serviceName: input.serviceName,
        },
        metadata: {
          appointmentId: input.appointmentId,
        },
        source: 'payments',
      });
    }

    for (const provider of providers) {
      await this.service.notify({
        topicKey: 'PRIORITY_QUEUE_PAYMENT_SUCCESS_PROVIDER',
        entityId: input.appointmentId,
        recipientIds: [provider.id],
        dedupeKey: `priority-queue:provider:${input.appointmentId}:${provider.id}`,
        templateData: {
          recipient_type: 'provider',
          patient_name: input.patientName,
          provider_name: provider.name || 'Provider',
          requested_date: requestedDate,
          appointment_reason: appointmentReason,
          provider_dashboard_url: buildPortalUrl('/waitlist'),
          platform_name: platformName,
          patientName: input.patientName,
          serviceName: input.serviceName,
        },
        metadata: {
          appointmentId: input.appointmentId,
        },
        source: 'payments',
      });
    }
  }

  async notifyFailedPayment(input: {
    chargeId: string;
    patientId?: string | null;
    patientEmail?: string | null;
    patientName?: string | null;
    amountInCents?: number | null;
  }): Promise<void> {
    const amountLabel = asCurrency(input.amountInCents ?? null);
    let patientRecipientId = input.patientId ?? null;

    if (!patientRecipientId && input.patientEmail) {
      const user = await this.repo.findUserByEmail(input.patientEmail);
      patientRecipientId = user?.id ?? null;
    }

    if (patientRecipientId) {
      await this.service.notify({
        topicKey: 'FAILED_PAYMENT_ALERT_PATIENT',
        entityId: input.chargeId,
        recipientIds: [patientRecipientId],
        dedupeKey: `failed-payment:patient:${input.chargeId}`,
        templateData: {
          patientName: input.patientName ?? 'Patient',
          amountLabel,
          portalLink: buildPortalUrl('/patient/billing'),
        },
        metadata: {
          chargeId: input.chargeId,
        },
        source: 'stripe',
      });
    }

    const admins = await this.repo.findUsersByRoles([
      'admin',
      'provider',
      'doctor',
    ]);
    if (admins.length === 0) return;

    await this.service.notify({
      topicKey: 'FAILED_PAYMENT_ALERT_ADMIN',
      entityId: input.chargeId,
      recipientIds: admins.map((a) => a.id),
      dedupeKey: `failed-payment:admin:${input.chargeId}`,
      templateData: {
        patientName: input.patientName ?? 'Patient',
        amountLabel,
        billingLink: buildPortalUrl('/billing'),
      },
      metadata: {
        chargeId: input.chargeId,
      },
      source: 'stripe',
    });
  }

  async notifyPrescriptionSent(input: {
    patientId: string;
    medicationName: string;
    prescriptionId: string;
  }): Promise<void> {
    await this.service.notify({
      topicKey: 'PRESCRIPTION_SENT_PATIENT',
      entityId: input.prescriptionId,
      recipientIds: [input.patientId],
      templateData: {
        medicationName: input.medicationName,
      },
      source: 'dosespot',
    });
  }

  async notifyPrescriptionError(input: {
    patientName: string;
    medicationName: string;
    errorDetails: string;
    prescriptionId: string;
  }): Promise<void> {
    const admins = await this.repo.findUsersByRoles([
      'admin',
      'provider',
      'doctor',
    ]);
    if (admins.length === 0) return;

    await this.service.notify({
      topicKey: 'PRESCRIPTION_ERROR_ADMIN',
      entityId: input.prescriptionId,
      recipientIds: admins.map((a) => a.id),
      templateData: {
        patientName: input.patientName,
        medicationName: input.medicationName,
        errorDetails: input.errorDetails,
      },
      source: 'dosespot',
    });
  }
}
