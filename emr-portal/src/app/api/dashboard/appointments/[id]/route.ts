import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const updateStatusSchema = z.object({
    status: z.enum(['checked_in', 'confirmed', 'pending', 'completed', 'cancelled', 'waitlist', 'no_show'])
});

const updateActionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('status'),
        status: z.enum(['checked_in', 'confirmed', 'pending', 'completed', 'cancelled', 'waitlist', 'no_show']),
    }),
    z.object({
        action: z.literal('reschedule'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        previousDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        previousTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    }),
]);

type MutableStatus = z.infer<typeof updateStatusSchema>['status'];

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function toStatusLabel(status: MutableStatus): string {
    if (status === 'checked_in') return 'Checked In';
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'pending') return 'Pending';
    if (status === 'completed') return 'Completed';
    if (status === 'cancelled') return 'Cancelled';
    if (status === 'no_show') return 'No-Show';
    return 'Waitlist';
}

function toPatientStatus(status: MutableStatus): 'scheduled' | 'completed' | 'cancelled' {
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    return 'scheduled';
}

function dispatchAppointmentNotificationInBackground(
    request: Request,
    payload: Record<string, unknown>,
    logContext: string,
): void {
    const url = new URL('/api/notifications/send', request.url);

    void fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: request.headers.get('authorization') ?? ''
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
    })
        .then(async (response) => {
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`${logContext} notification failed`, {
                    status: response.status,
                    body: errorText,
                    payload,
                });
                return;
            }

            console.info(`${logContext} notification queued`, payload);
        })
        .catch((error) => {
            console.error(`${logContext} notification request failed`, {
                error: error instanceof Error ? error.message : String(error),
                payload,
            });
        });
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { user, errorResponse } = await requireAuthenticatedUser(request, { resolveRole: false });
    if (errorResponse) return errorResponse;
    if (!user) {
        return NextResponse.json(
            { success: false, error: 'Authentication required.' },
            { status: 401 }
        );
    }

    const initialProviderAccessError = ensureProviderAccess(user);
    if (initialProviderAccessError) return initialProviderAccessError;

    if (!db) {
        return NextResponse.json(
            { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
            { status: 500 }
        );
    }

    try {
        const rawBody = await request.json();
        const parsedBody = (
            rawBody && typeof rawBody === 'object' && rawBody !== null && 'action' in rawBody
        )
            ? updateActionSchema.safeParse(rawBody)
            : updateStatusSchema.safeParse(rawBody);

        if (!parsedBody.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid appointment update payload.' },
                { status: 400 }
            );
        }

        const appointmentId = params.id;
        if (!appointmentId) {
            return NextResponse.json(
                { success: false, error: 'Appointment id is required.' },
                { status: 400 }
            );
        }

        const appointmentRef = db.collection('appointments').doc(appointmentId);
        const [providerDoc, appointmentSnap] = await Promise.all([
            db.collection('users').doc(user.uid).get(),
            appointmentRef.get()
        ]);

        const providerAccessError = ensureProviderAccess(
            user,
            normalizeRole(user.token.role ?? providerDoc.data()?.role ?? user.role)
        );
        if (providerAccessError) return providerAccessError;

        if (!appointmentSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found.' },
                { status: 404 }
            );
        }

        const appointmentData = appointmentSnap.data() ?? {};
        if (appointmentData.providerId !== user.uid) {
            return NextResponse.json(
                { success: false, error: 'You do not have access to this appointment.' },
                { status: 403 }
            );
        }

        const now = new Date();
        const batch = db.batch();
        const patientId = asNonEmptyString(appointmentData.patientId) ?? asNonEmptyString(appointmentData.patientUid);
        const patientAppointmentsRef = patientId
            ? db.collection('patients').doc(patientId).collection('appointments')
            : null;
        const consultationRef = db.collection('consultations').doc(appointmentId);
        const patientAppointmentIds = new Set<string>();

        if (patientAppointmentsRef) {
            const [appointmentByIdSnap, appointmentByGlobalIdSnap, appointmentByConsultationIdSnap] = await Promise.all([
                patientAppointmentsRef.doc(appointmentId).get(),
                patientAppointmentsRef.where('globalAppointmentId', '==', appointmentId).get(),
                patientAppointmentsRef.where('consultationId', '==', appointmentId).get(),
            ]);

            if (appointmentByIdSnap.exists) {
                patientAppointmentIds.add(appointmentByIdSnap.id);
            }
            appointmentByGlobalIdSnap.docs.forEach((patientDoc) => {
                patientAppointmentIds.add(patientDoc.id);
            });
            appointmentByConsultationIdSnap.docs.forEach((patientDoc) => {
                patientAppointmentIds.add(patientDoc.id);
            });
        }

        const normalizedAction = 'action' in parsedBody.data
            ? parsedBody.data
            : { action: 'status' as const, status: parsedBody.data.status };

        if (normalizedAction.action === 'reschedule') {
            if (appointmentData.status === 'completed' || appointmentData.status === 'cancelled') {
                return NextResponse.json(
                    { success: false, error: 'Completed or cancelled appointments cannot be rescheduled.' },
                    { status: 400 }
                );
            }

            const nextStart = new Date(`${normalizedAction.date}T${normalizedAction.time}:00`);
            if (Number.isNaN(nextStart.getTime())) {
                return NextResponse.json(
                    { success: false, error: 'Invalid appointment date/time.' },
                    { status: 400 }
                );
            }

            if (nextStart.getTime() < now.getTime()) {
                return NextResponse.json(
                    { success: false, error: 'Appointments cannot be moved into the past.' },
                    { status: 400 }
                );
            }

            batch.update(appointmentRef, {
                date: normalizedAction.date,
                time: normalizedAction.time,
                scheduledAt: Timestamp.fromDate(nextStart),
                startTime: Timestamp.fromDate(nextStart),
                updatedAt: now,
            });

            batch.set(consultationRef, {
                date: normalizedAction.date,
                time: normalizedAction.time,
                scheduledAt: Timestamp.fromDate(nextStart),
                startTime: Timestamp.fromDate(nextStart),
                updatedAt: now,
            }, { merge: true });

            if (patientAppointmentsRef && patientAppointmentIds.size > 0) {
                patientAppointmentIds.forEach((patientAppointmentId) => {
                    batch.update(patientAppointmentsRef.doc(patientAppointmentId), {
                        scheduledAt: Timestamp.fromDate(nextStart),
                        date: Timestamp.fromDate(nextStart),
                        startTime: Timestamp.fromDate(nextStart),
                        updatedAt: now,
                    });
                });
            }

            await batch.commit();

            dispatchAppointmentNotificationInBackground(
                request,
                {
                    type: 'appointment_rescheduled',
                    appointmentId,
                    previousDate: normalizedAction.previousDate,
                    previousTime: normalizedAction.previousTime,
                },
                'Dashboard appointment reschedule',
            );

            return NextResponse.json({
                success: true,
                appointment: {
                    id: appointmentId,
                    statusKey: asNonEmptyString(appointmentData.status) ?? 'confirmed',
                    statusLabel: toStatusLabel((asNonEmptyString(appointmentData.status) as MutableStatus) ?? 'confirmed'),
                    startAt: nextStart.toISOString(),
                    date: normalizedAction.date,
                    time: normalizedAction.time,
                }
            });
        }

        const newStatus = normalizedAction.status;
        const appointmentUpdate: Record<string, unknown> = {
            status: newStatus,
            updatedAt: now
        };
        if (newStatus === 'completed') {
            appointmentUpdate.completedAt = now;
        }
        if (newStatus === 'cancelled') {
            appointmentUpdate.cancelledAt = now;
        }

        batch.update(appointmentRef, appointmentUpdate);

        if (patientAppointmentsRef && patientAppointmentIds.size > 0) {
            const patientStatus = toPatientStatus(newStatus);
            const patientUpdate: Record<string, unknown> = {
                status: patientStatus,
                updatedAt: now
            };
            if (newStatus === 'completed') {
                patientUpdate.completedAt = now;
            }
            if (newStatus === 'cancelled') {
                patientUpdate.cancelledAt = now;
            }

            patientAppointmentIds.forEach((patientAppointmentId) => {
                batch.update(patientAppointmentsRef.doc(patientAppointmentId), patientUpdate);
            });
        }

        await batch.commit();

        if (newStatus === 'cancelled') {
            dispatchAppointmentNotificationInBackground(
                request,
                {
                    type: 'appointment_cancelled',
                    appointmentId,
                },
                'Dashboard appointment cancellation',
            );
        }

        return NextResponse.json({
            success: true,
            appointment: {
                id: appointmentId,
                statusKey: newStatus,
                statusLabel: toStatusLabel(newStatus)
            }
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Dashboard appointment update error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
