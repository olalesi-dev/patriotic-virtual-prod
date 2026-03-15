import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const updateStatusSchema = z.object({
    status: z.enum(['checked_in', 'confirmed', 'pending', 'completed', 'cancelled', 'waitlist'])
});

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
    return 'Waitlist';
}

function toPatientStatus(status: MutableStatus): 'scheduled' | 'completed' | 'cancelled' {
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    return 'scheduled';
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
        const parsedBody = updateStatusSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid status value.' },
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

        const newStatus = parsedBody.data.status;
        const now = new Date();
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

        const batch = db.batch();
        batch.update(appointmentRef, appointmentUpdate);

        const patientId = asNonEmptyString(appointmentData.patientId) ?? asNonEmptyString(appointmentData.patientUid);
        if (patientId) {
            const patientAppointmentsRef = db.collection('patients').doc(patientId).collection('appointments');
            const [appointmentByIdSnap, appointmentByGlobalIdSnap] = await Promise.all([
                patientAppointmentsRef.doc(appointmentId).get(),
                patientAppointmentsRef.where('globalAppointmentId', '==', appointmentId).get()
            ]);

            const patientAppointmentIds = new Set<string>();
            if (appointmentByIdSnap.exists) {
                patientAppointmentIds.add(appointmentByIdSnap.id);
            }
            appointmentByGlobalIdSnap.docs.forEach((patientDoc) => {
                patientAppointmentIds.add(patientDoc.id);
            });

            if (patientAppointmentIds.size > 0) {
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
        }

        await batch.commit();

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
