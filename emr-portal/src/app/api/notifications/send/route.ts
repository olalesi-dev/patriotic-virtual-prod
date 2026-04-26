import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendBackendNotification } from '@/lib/backend-notifications';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const REMINDER_SPECS = [
    {
        topicKey: 'APPOINTMENT_REMINDER_24H' as const,
        hoursBefore: 24,
        dedupeSuffix: '24h',
        channels: ['email', 'in_app'] as Array<'email' | 'in_app'>,
    },
    {
        topicKey: 'APPOINTMENT_REMINDER_8H' as const,
        hoursBefore: 8,
        dedupeSuffix: '8h',
        channels: ['in_app'] as Array<'in_app'>,
    },
    {
        topicKey: 'APPOINTMENT_REMINDER_1H' as const,
        hoursBefore: 1,
        dedupeSuffix: '1h',
        channels: ['email', 'in_app'] as Array<'email' | 'in_app'>,
    },
] as const;

const appointmentNotificationSchema = z.object({
    type: z.enum(['appointment_booked', 'appointment_rescheduled', 'appointment_cancelled']),
    appointmentId: z.string().trim().min(1),
    previousDate: z.string().trim().optional(),
    previousTime: z.string().trim().optional(),
    cancellationReason: z.string().trim().optional(),
});

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

function readDisplayName(value: Record<string, unknown> | undefined): string | null {
    const directName = asNonEmptyString(value?.name) ?? asNonEmptyString(value?.displayName);
    if (directName) return directName;

    const firstName = asNonEmptyString(value?.firstName);
    const lastName = asNonEmptyString(value?.lastName);
    if (firstName && lastName) return `${firstName} ${lastName}`;
    return firstName ?? lastName ?? null;
}

function resolveAppointmentDate(data: Record<string, unknown>): Date | null {
    const startAt = asDate(data.startTime);
    if (startAt) return startAt;

    const date = asNonEmptyString(data.date);
    const time = asNonEmptyString(data.time);
    if (date && time) {
        const parsed = new Date(`${date}T${time}:00`);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    return asDate(data.date);
}

function buildNotificationBody(
    type: 'appointment_booked' | 'appointment_rescheduled' | 'appointment_cancelled',
    patientName: string,
    date: Date | null
): string {
    const dateLabel = date
        ? new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(date)
        : 'an upcoming slot';

    if (type === 'appointment_booked') {
        return `${patientName} booked an appointment for ${dateLabel}.`;
    }
    if (type === 'appointment_rescheduled') {
        return `${patientName} rescheduled an appointment to ${dateLabel}.`;
    }
    return `${patientName} cancelled an appointment scheduled for ${dateLabel}.`;
}

function buildPortalUrl(request: Request, path: string): string {
    return new URL(path, request.url).toString();
}

function formatAppointmentDate(date: Date | null): string {
    if (!date) return 'TBD';
    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function formatAppointmentTime(date: Date | null): string {
    if (!date) return 'TBD';
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

function resolveAppointmentLocation(data: Record<string, unknown>): string {
    return asNonEmptyString(data.meetingUrl)
        ?? asNonEmptyString(data.location)
        ?? asNonEmptyString(data.service)
        ?? asNonEmptyString(data.type)
        ?? 'See your patient portal for location details.';
}

function resolvePreviousAppointmentDate(previousDate: string | undefined, previousTime: string | undefined): Date | null {
    if (!previousDate || !previousTime) return null;
    const parsed = new Date(`${previousDate}T${previousTime}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildReminderSchedules(input: {
    appointmentId: string;
    appointmentDate: Date | null;
    reminderBaseDedupe: string;
    templateData: Record<string, unknown>;
    recipientType: 'patient' | 'provider';
}): Array<{
    topicKey: 'APPOINTMENT_REMINDER_24H' | 'APPOINTMENT_REMINDER_8H' | 'APPOINTMENT_REMINDER_1H';
    entityId: string;
    dedupeKey: string;
    sendAt: string;
    channels: Array<'email' | 'in_app'> | Array<'in_app'>;
    templateData: Record<string, unknown>;
    metadata: Record<string, unknown>;
}> {
    if (!input.appointmentDate) return [];
    const appointmentDate = input.appointmentDate;

    return REMINDER_SPECS.map((reminder) => ({
        topicKey: reminder.topicKey,
        entityId: input.appointmentId,
        dedupeKey: `${input.reminderBaseDedupe}:${input.recipientType}:${reminder.dedupeSuffix}`,
        sendAt: new Date(appointmentDate.getTime() - reminder.hoursBefore * 60 * 60 * 1000).toISOString(),
        channels: reminder.channels,
        templateData: input.templateData,
        metadata: {
            appointmentId: input.appointmentId,
            recipientType: input.recipientType,
            reminderHoursBefore: reminder.hoursBefore,
        },
    }));
}

export async function POST(request: Request) {
    const { user, errorResponse } = await requireAuthenticatedUser(request, { resolveRole: false });
    if (errorResponse) return errorResponse;
    if (!user) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (!db) {
        return NextResponse.json(
            { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
            { status: 500 }
        );
    }

    try {
        const parsedBody = appointmentNotificationSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json({ success: false, error: 'Invalid notification payload.' }, { status: 400 });
        }

        console.info('Appointment notification orchestration requested', {
            type: parsedBody.data.type,
            appointmentId: parsedBody.data.appointmentId,
        });

        const appointmentDoc = await db.collection('appointments').doc(parsedBody.data.appointmentId).get();
        if (!appointmentDoc.exists) {
            return NextResponse.json({ success: false, error: 'Appointment not found.' }, { status: 404 });
        }

        const appointmentData = appointmentDoc.data() as Record<string, unknown>;
        const appointmentPatientId = asNonEmptyString(appointmentData.patientId) ?? asNonEmptyString(appointmentData.patientUid);
        if (!appointmentPatientId) {
            return NextResponse.json(
                { success: false, error: 'Appointment patient could not be resolved.' },
                { status: 400 }
            );
        }

        const providerId = asNonEmptyString(appointmentData.providerId);
        if (!providerId) {
            return NextResponse.json(
                { success: false, error: 'Appointment provider could not be resolved.' },
                { status: 400 }
            );
        }

        const isPatientActor = appointmentPatientId === user.uid;
        const isProviderActor = providerId === user.uid;
        if (!isPatientActor && !isProviderActor) {
            return NextResponse.json(
                { success: false, error: 'You do not have access to notify for this appointment.' },
                { status: 403 }
            );
        }

        const [actorUserDoc, actorPatientDoc, appointmentPatientDoc, appointmentPatientUserDoc] = await Promise.all([
            db.collection('users').doc(user.uid).get(),
            db.collection('patients').doc(user.uid).get(),
            db.collection('patients').doc(appointmentPatientId).get(),
            db.collection('users').doc(appointmentPatientId).get(),
        ]);

        const actorName = (
            readDisplayName(actorPatientDoc.exists ? actorPatientDoc.data() as Record<string, unknown> : undefined) ??
            readDisplayName(actorUserDoc.exists ? actorUserDoc.data() as Record<string, unknown> : undefined) ??
            asNonEmptyString(user.token.name) ??
            user.email?.split('@')[0] ??
            'Care Team'
        ) as string;
        const patientName = (
            asNonEmptyString(appointmentData.patientName) ??
            readDisplayName(appointmentPatientDoc.exists ? appointmentPatientDoc.data() as Record<string, unknown> : undefined) ??
            readDisplayName(appointmentPatientUserDoc.exists ? appointmentPatientUserDoc.data() as Record<string, unknown> : undefined) ??
            'Patient'
        ) as string;
        const providerName = (
            asNonEmptyString(appointmentData.providerName) ??
            (isProviderActor ? actorName : null) ??
            'Care Team'
        ) as string;

        const appointmentDate = resolveAppointmentDate(appointmentData);
        const previousAppointmentDate = parsedBody.data.type === 'appointment_rescheduled'
            ? resolvePreviousAppointmentDate(parsedBody.data.previousDate, parsedBody.data.previousTime)
            : null;
        const topicKey = parsedBody.data.type === 'appointment_booked'
            ? 'APPOINTMENT_BOOKED'
            : parsedBody.data.type === 'appointment_rescheduled'
                ? 'APPOINTMENT_RESCHEDULED'
                : 'APPOINTMENT_CANCELLED';
        const patientPortalLink = buildPortalUrl(request, '/patient/scheduled');
        const providerPortalLink = buildPortalUrl(request, '/calendar');
        const patientScheduleUrl = buildPortalUrl(request, '/book');
        const appointmentLocation = resolveAppointmentLocation(appointmentData);
        const platformName = 'Patriotic Telehealth';
        const reminderBaseDedupe = `appointment-reminder:${appointmentDoc.id}`;
        const cancelDedupeKeys = ['patient', 'provider'].flatMap((recipientType) => (
            REMINDER_SPECS.map((reminder) => `${reminderBaseDedupe}:${recipientType}:${reminder.dedupeSuffix}`)
        ));

        const patientTemplateData = {
            recipient_type: 'patient',
            patient_name: patientName,
            provider_name: providerName,
            requested_date: formatAppointmentDate(appointmentDate),
            appointment_reason: asNonEmptyString(appointmentData.reason) ?? asNonEmptyString(appointmentData.notes) ?? asNonEmptyString(appointmentData.service) ?? 'Appointment request',
            appointment_date: formatAppointmentDate(appointmentDate),
            appointment_time: formatAppointmentTime(appointmentDate),
            appointment_location: appointmentLocation,
            reschedule_url: patientPortalLink,
            manage_url: patientPortalLink,
            schedule_url: patientScheduleUrl,
            cancellation_reason: parsedBody.data.cancellationReason,
            old_date: formatAppointmentDate(previousAppointmentDate),
            old_time: formatAppointmentTime(previousAppointmentDate),
            new_date: formatAppointmentDate(appointmentDate),
            new_time: formatAppointmentTime(appointmentDate),
            platform_name: platformName,
            patientName,
            providerName,
            appointmentAt: appointmentDate?.toISOString() ?? null,
            portalLink: patientPortalLink,
        };

        const providerTemplateData = {
            recipient_type: 'provider',
            patient_name: patientName,
            provider_name: providerName,
            requested_date: formatAppointmentDate(appointmentDate),
            appointment_reason: asNonEmptyString(appointmentData.reason) ?? asNonEmptyString(appointmentData.notes) ?? asNonEmptyString(appointmentData.service) ?? 'Appointment request',
            provider_dashboard_url: providerPortalLink,
            appointment_date: formatAppointmentDate(appointmentDate),
            appointment_time: formatAppointmentTime(appointmentDate),
            appointment_location: appointmentLocation,
            reschedule_url: providerPortalLink,
            manage_url: providerPortalLink,
            schedule_url: providerPortalLink,
            cancellation_reason: parsedBody.data.cancellationReason,
            old_date: formatAppointmentDate(previousAppointmentDate),
            old_time: formatAppointmentTime(previousAppointmentDate),
            new_date: formatAppointmentDate(appointmentDate),
            new_time: formatAppointmentTime(appointmentDate),
            platform_name: platformName,
            patientName,
            providerName,
            appointmentAt: appointmentDate?.toISOString() ?? null,
            portalLink: providerPortalLink,
        };

        const patientFollowUpSchedules = parsedBody.data.type === 'appointment_cancelled'
            ? []
            : buildReminderSchedules({
                appointmentId: appointmentDoc.id,
                appointmentDate,
                reminderBaseDedupe,
                templateData: patientTemplateData,
                recipientType: 'patient',
            });

        const providerFollowUpSchedules = parsedBody.data.type === 'appointment_cancelled'
            ? []
            : buildReminderSchedules({
                appointmentId: appointmentDoc.id,
                appointmentDate,
                reminderBaseDedupe,
                templateData: providerTemplateData,
                recipientType: 'provider',
            });

        const authorizationHeader = request.headers.get('authorization') ?? '';
        await Promise.all([
            sendBackendNotification(authorizationHeader, {
                topicKey,
                entityId: appointmentDoc.id,
                recipientIds: [appointmentPatientId],
                dedupeKey: `appointment:${parsedBody.data.type}:${appointmentDoc.id}:patient`,
                channels: ['email', 'in_app'],
                templateData: patientTemplateData,
                metadata: {
                    appointmentId: appointmentDoc.id,
                    patientId: appointmentPatientId,
                    providerId,
                    actorRole: isPatientActor ? 'patient' : 'provider',
                    status: asNonEmptyString(appointmentData.status),
                    trigger: isPatientActor ? 'patient_action' : 'provider_action',
                    recipientType: 'patient',
                },
                actorId: user.uid,
                actorName,
                source: 'appointments',
                cancelDedupeKeys,
                followUpSchedules: patientFollowUpSchedules,
            }),
            sendBackendNotification(authorizationHeader, {
                topicKey,
                entityId: appointmentDoc.id,
                recipientIds: [providerId],
                dedupeKey: `appointment:${parsedBody.data.type}:${appointmentDoc.id}:provider`,
                channels: ['email', 'in_app'],
                templateData: providerTemplateData,
                metadata: {
                    appointmentId: appointmentDoc.id,
                    patientId: appointmentPatientId,
                    providerId,
                    actorRole: isPatientActor ? 'patient' : 'provider',
                    status: asNonEmptyString(appointmentData.status),
                    trigger: isPatientActor ? 'patient_action' : 'provider_action',
                    recipientType: 'provider',
                },
                actorId: user.uid,
                actorName,
                source: 'appointments',
                cancelDedupeKeys,
                followUpSchedules: providerFollowUpSchedules,
            }),
        ]);

        return NextResponse.json({
            success: true,
            scheduled: true
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Notification send API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
