import { buildPortalUrl } from './links';
import { formatRequestedDate, getPlatformName } from './template-data';
import { NotificationRepository } from './repository';
import { notificationService } from './service';

const repository = new NotificationRepository();

function asCurrency(amountInCents: number | null): string {
    if (amountInCents === null) return 'an outstanding balance';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amountInCents / 100);
}

export async function notifyPriorityQueuePaymentSuccess(input: {
    appointmentId: string;
    patientId?: string | null;
    patientName: string;
    serviceName: string;
    requestedAt?: Date | string | null;
    appointmentReason?: string | null;
}): Promise<void> {
    const recipientIds = await repository.findUsersByRoles(['provider', 'doctor', 'admin']);
    const platformName = getPlatformName();
    const requestedDate = formatRequestedDate(input.requestedAt ?? new Date());
    const appointmentReason = input.appointmentReason?.trim() || input.serviceName;

    if (input.patientId) {
        await notificationService.notify({
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

    for (const recipient of recipientIds) {
        await notificationService.notify({
            topicKey: 'PRIORITY_QUEUE_PAYMENT_SUCCESS_PROVIDER',
            entityId: input.appointmentId,
            recipientIds: [recipient.uid],
            dedupeKey: `priority-queue:provider:${input.appointmentId}:${recipient.uid}`,
            templateData: {
                recipient_type: 'provider',
                patient_name: input.patientName,
                provider_name: recipient.displayName || 'Provider',
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

export async function notifyFailedPayment(input: {
    chargeId: string;
    patientId?: string | null;
    patientEmail?: string | null;
    patientName?: string | null;
    amountInCents?: number | null;
}): Promise<void> {
    const amountLabel = asCurrency(input.amountInCents ?? null);
    let patientRecipientId = input.patientId ?? null;

    if (!patientRecipientId && input.patientEmail) {
        const recipient = await repository.findRecipientByEmail(input.patientEmail);
        patientRecipientId = recipient?.uid ?? null;
    }

    if (patientRecipientId) {
        await notificationService.notify({
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

    const admins = await repository.findUsersByRoles(['admin', 'provider', 'doctor']);
    if (admins.length === 0) return;

    await notificationService.notify({
        topicKey: 'FAILED_PAYMENT_ALERT_ADMIN',
        entityId: input.chargeId,
        recipientIds: admins.map((recipient) => recipient.uid),
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
