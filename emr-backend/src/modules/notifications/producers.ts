import { buildPortalUrl } from './links';
import { formatRequestedDate, getPlatformName } from './template-data';
import { NotificationRepository } from './repository';
import { notificationService } from './service';
import { sendDirectTemplateEmail } from './direct-email';
import { logger } from '../../utils/logger';

const repository = new NotificationRepository();

const NEW_PATIENT_ACCOUNT_EMAIL_RECIPIENTS = new Set([
    'alvaro@patriotictelehealth.com',
    'oliver@patriotictelehealth.com',
    'nyah@patriotictelehealth.com',
    'dr.o@patriotictelehealth.com',
    'ladonna@patriotictelehealth.com',
    'tamal@patriotictelehealth.com',
    'dayo@patriotictelehealth.com',
    'support@patriotictelehealth.com',
]);

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

export async function notifyNewPatientAccountCreated(input: {
    patientUid: string;
    firstName?: string | null;
    patientEmail?: string | null;
}): Promise<void> {
    const firstName = input.firstName?.trim() || 'Patient';
    const patientEmail = input.patientEmail?.trim() || null;
    const platformName = getPlatformName();
    const recipients = Array.from(NEW_PATIENT_ACCOUNT_EMAIL_RECIPIENTS);

    const results = await Promise.allSettled(
        recipients.map((toEmail) => sendDirectTemplateEmail({
            templateKey: 'patient_welcome',
            toEmail,
            templateData: {
                first_name: firstName,
                platform_name: platformName,
                support_email: 'support@patriotictelehealth.com',
                firstName,
                platformName,
                supportEmail: 'support@patriotictelehealth.com',
                patient_uid: input.patientUid,
                patient_email: patientEmail,
                patientUid: input.patientUid,
                patientEmail,
            },
            customArgs: {
                source: 'new-patient-account',
                patientUid: input.patientUid,
            },
        })),
    );

    const failedRecipients = results
        .map((result, index) => ({
            result,
            toEmail: recipients[index],
        }))
        .filter((entry): entry is { result: PromiseRejectedResult; toEmail: string } => entry.result.status === 'rejected');

    if (failedRecipients.length > 0) {
        logger.warn('New patient account notification emails failed', {
            patientUid: input.patientUid,
            failedRecipients: failedRecipients.map((entry) => entry.toEmail),
            errors: failedRecipients.map((entry) => entry.result.reason instanceof Error
                ? entry.result.reason.message
                : String(entry.result.reason)),
        });
    }
}
