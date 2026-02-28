import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { createNotification } from '@/lib/server-notifications';

export const dynamic = 'force-dynamic';

const appointmentNotificationSchema = z.object({
    type: z.enum(['appointment_booked', 'appointment_rescheduled', 'appointment_cancelled']),
    appointmentId: z.string().trim().min(1)
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

        const appointmentDoc = await db.collection('appointments').doc(parsedBody.data.appointmentId).get();
        if (!appointmentDoc.exists) {
            return NextResponse.json({ success: false, error: 'Appointment not found.' }, { status: 404 });
        }

        const appointmentData = appointmentDoc.data() as Record<string, unknown>;
        const appointmentPatientId = asNonEmptyString(appointmentData.patientId) ?? asNonEmptyString(appointmentData.patientUid);
        if (!appointmentPatientId || appointmentPatientId !== user.uid) {
            return NextResponse.json(
                { success: false, error: 'You do not have access to notify for this appointment.' },
                { status: 403 }
            );
        }

        const providerId = asNonEmptyString(appointmentData.providerId);
        if (!providerId) {
            return NextResponse.json(
                { success: false, error: 'Appointment provider could not be resolved.' },
                { status: 400 }
            );
        }

        const [userDoc, patientDoc] = await Promise.all([
            db.collection('users').doc(user.uid).get(),
            db.collection('patients').doc(user.uid).get()
        ]);

        const patientName = (
            readDisplayName(patientDoc.exists ? patientDoc.data() as Record<string, unknown> : undefined) ??
            readDisplayName(userDoc.exists ? userDoc.data() as Record<string, unknown> : undefined) ??
            asNonEmptyString(user.token.name) ??
            user.email?.split('@')[0] ??
            'Patient'
        ) as string;

        const appointmentDate = resolveAppointmentDate(appointmentData);
        const title = parsedBody.data.type === 'appointment_booked'
            ? 'New appointment booking'
            : parsedBody.data.type === 'appointment_rescheduled'
                ? 'Appointment rescheduled'
                : 'Appointment cancelled';
        const body = buildNotificationBody(parsedBody.data.type, patientName, appointmentDate);

        const notification = await createNotification({
            recipientId: providerId,
            actorId: user.uid,
            actorName: patientName,
            type: parsedBody.data.type,
            title,
            body,
            href: '/dashboard',
            metadata: {
                appointmentId: appointmentDoc.id,
                patientId: user.uid,
                status: asNonEmptyString(appointmentData.status),
                trigger: 'patient_action'
            }
        });

        return NextResponse.json({
            success: true,
            notification
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
