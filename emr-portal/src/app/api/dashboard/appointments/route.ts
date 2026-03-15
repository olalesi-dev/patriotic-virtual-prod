import { randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

const createAppointmentSchema = z.object({
    patientId: z.string().trim().min(1),
    patientName: z.string().trim().min(1).max(120).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    visitType: z.enum(['video', 'in_person']),
    notes: z.string().trim().min(2).max(500)
});

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function readDisplayName(value: Record<string, unknown> | undefined): string | null {
    const directName = asNonEmptyString(value?.name) ?? asNonEmptyString(value?.displayName);
    if (directName) return directName;

    const firstName = asNonEmptyString(value?.firstName);
    const lastName = asNonEmptyString(value?.lastName);
    if (firstName && lastName) return `${firstName} ${lastName}`;
    return firstName ?? lastName ?? null;
}

function sanitizePlainText(value: string): string {
    return value
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/[<>]/g, '')
        .trim();
}

function buildTelehealthUrl(): string {
    return `https://doxy.me/patriotic-visit-${randomUUID().slice(0, 8)}`;
}

function formatDisplayTime(startAt: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(startAt);
}

export async function POST(request: Request) {
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
        const parsedBody = createAppointmentSchema.safeParse(await request.json());
        if (!parsedBody.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid appointment payload.' },
                { status: 400 }
            );
        }

        const [providerDoc, patientUserDoc, patientDoc] = await Promise.all([
            db.collection('users').doc(user.uid).get(),
            db.collection('users').doc(parsedBody.data.patientId).get(),
            db.collection('patients').doc(parsedBody.data.patientId).get()
        ]);

        const providerAccessError = ensureProviderAccess(
            user,
            normalizeRole(user.token.role ?? providerDoc.data()?.role ?? user.role)
        );
        if (providerAccessError) return providerAccessError;

        const providerName = (
            readDisplayName(providerDoc.data() as Record<string, unknown> | undefined) ??
            asNonEmptyString(user.token.name) ??
            user.email?.split('@')[0] ??
            'Provider'
        ) as string;

        const patientName = (
            readDisplayName(patientDoc.exists ? patientDoc.data() as Record<string, unknown> : undefined) ??
            readDisplayName(patientUserDoc.exists ? patientUserDoc.data() as Record<string, unknown> : undefined) ??
            asNonEmptyString(sanitizePlainText(parsedBody.data.patientName ?? '')) ??
            'Patient'
        ) as string;

        const startAt = new Date(`${parsedBody.data.date}T${parsedBody.data.time}:00`);
        if (Number.isNaN(startAt.getTime())) {
            return NextResponse.json(
                { success: false, error: 'Invalid appointment date/time.' },
                { status: 400 }
            );
        }

        if (startAt.getTime() < Date.now() - 60_000) {
            return NextResponse.json(
                { success: false, error: 'Appointment time must be in the future.' },
                { status: 400 }
            );
        }

        const notes = sanitizePlainText(parsedBody.data.notes);
        const visitType = parsedBody.data.visitType;
        const meetingUrl = visitType === 'video' ? buildTelehealthUrl() : null;
        const typeLabel = visitType === 'video' ? 'Telehealth' : 'In-Person';
        const serviceLabel = visitType === 'video' ? 'Telehealth Visit' : 'In-Person Visit';
        const now = new Date();

        const appointmentRef = db.collection('appointments').doc();
        const patientAppointmentRef = db
            .collection('patients')
            .doc(parsedBody.data.patientId)
            .collection('appointments')
            .doc(appointmentRef.id);

        const batch = db.batch();
        batch.set(appointmentRef, {
            providerId: user.uid,
            providerName,
            patientId: parsedBody.data.patientId,
            patientUid: parsedBody.data.patientId,
            patientName,
            patient: patientName,
            date: parsedBody.data.date,
            time: parsedBody.data.time,
            startTime: Timestamp.fromDate(startAt),
            status: 'pending',
            type: typeLabel,
            service: serviceLabel,
            notes,
            reason: notes,
            meetingUrl,
            source: 'provider_dashboard',
            createdAt: now,
            updatedAt: now
        });

        batch.set(patientAppointmentRef, {
            providerId: user.uid,
            providerName,
            doctor: providerName,
            date: Timestamp.fromDate(startAt),
            startTime: Timestamp.fromDate(startAt),
            status: 'scheduled',
            type: typeLabel,
            reason: notes,
            notes,
            meetingUrl,
            globalAppointmentId: appointmentRef.id,
            source: 'provider_dashboard',
            createdAt: now,
            updatedAt: now
        }, { merge: true });

        await batch.commit();

        return NextResponse.json({
            success: true,
            appointment: {
                id: appointmentRef.id,
                patient: patientName,
                displayTime: formatDisplayTime(startAt),
                type: serviceLabel,
                statusKey: 'pending',
                statusLabel: 'Pending',
                startAt: startAt.toISOString(),
                notes,
                meetingUrl
            }
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Dashboard appointment create error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
