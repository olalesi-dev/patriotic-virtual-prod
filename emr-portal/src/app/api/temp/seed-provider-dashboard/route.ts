import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

function toDateAndTimeParts(value: Date) {
    const date = value.toISOString().slice(0, 10);
    const time = value.toISOString().slice(11, 16);
    return { date, time };
}

function addHours(baseDate: Date, hours: number, minutes: number = 0) {
    const next = new Date(baseDate);
    next.setHours(hours, minutes, 0, 0);
    return next;
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

    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { success: false, error: 'Demo seed endpoint is disabled in production.' },
            { status: 403 }
        );
    }

    try {
        const [providerDoc, providerPatientDoc] = await Promise.all([
            db.collection('users').doc(user.uid).get(),
            db.collection('patients').doc(user.uid).get()
        ]);

        const providerAccessError = ensureProviderAccess(
            user,
            normalizeRole(user.token.role ?? providerDoc.data()?.role ?? providerPatientDoc.data()?.role ?? user.role)
        );
        if (providerAccessError) return providerAccessError;

        const providerName = (
            providerDoc.data()?.name ??
            providerDoc.data()?.displayName ??
            providerPatientDoc.data()?.name ??
            user.token.name ??
            user.email?.split('@')[0] ??
            'Provider'
        ) as string;

        await db.collection('users').doc(user.uid).set({
            role: 'provider',
            name: providerName,
            updatedAt: new Date()
        }, { merge: true });

        const now = new Date();
        const todayMorning = addHours(now, 9, 0);
        const todayLateMorning = addHours(now, 10, 30);
        const todayAfternoon = addHours(now, 13, 30);
        const todayEvening = addHours(now, 16, 0);
        const yesterday = addHours(new Date(now.getTime() - 24 * 60 * 60 * 1000), 11, 0);
        const tomorrow = addHours(new Date(now.getTime() + 24 * 60 * 60 * 1000), 14, 15);
        const inThreeDays = addHours(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), 9, 45);

        const demoPatients = [
            { id: 'demo_provider_pt_01', firstName: 'Emily', lastName: 'Chen', email: 'emily.chen@example.com' },
            { id: 'demo_provider_pt_02', firstName: 'Marcus', lastName: 'Hill', email: 'marcus.hill@example.com' },
            { id: 'demo_provider_pt_03', firstName: 'Nina', lastName: 'Patel', email: 'nina.patel@example.com' },
            { id: 'demo_provider_pt_04', firstName: 'Robert', lastName: 'Garcia', email: 'robert.garcia@example.com' },
            { id: 'demo_provider_pt_05', firstName: 'Alina', lastName: 'Brooks', email: 'alina.brooks@example.com' }
        ];

        for (const patient of demoPatients) {
            await db.collection('patients').doc(patient.id).set({
                uid: patient.id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                name: `${patient.firstName} ${patient.lastName}`,
                email: patient.email,
                role: 'patient',
                updatedAt: new Date()
            }, { merge: true });
        }

        const existingAppointments = await db.collection('appointments')
            .where('providerId', '==', user.uid)
            .where('source', '==', 'dashboard_demo_seed')
            .get();

        for (const appointmentDoc of existingAppointments.docs) {
            await appointmentDoc.ref.delete();
        }

        const existingThreads = await db.collection('threads')
            .where('providerId', '==', user.uid)
            .where('source', '==', 'dashboard_demo_seed')
            .get();

        for (const threadDoc of existingThreads.docs) {
            await threadDoc.ref.delete();
        }

        const demoAppointments = [
            {
                patient: 'Emily Chen',
                patientId: 'demo_provider_pt_01',
                status: 'checked_in',
                type: 'video',
                service: 'Video Follow-up',
                when: todayMorning,
                notes: 'Discuss blood pressure trend and medication tolerance.',
                meetingUrl: 'https://meet.google.com/ptv-emily-checkin'
            },
            {
                patient: 'Marcus Hill',
                patientId: 'demo_provider_pt_02',
                status: 'confirmed',
                type: 'video',
                service: 'Medication Management',
                when: todayLateMorning,
                notes: 'Review response to metformin and update refill plan.',
                meetingUrl: 'https://meet.google.com/ptv-marcus-med'
            },
            {
                patient: 'Nina Patel',
                patientId: 'demo_provider_pt_03',
                status: 'pending',
                type: 'in-person',
                service: 'Initial Consultation',
                when: todayAfternoon,
                notes: 'New intake with fasting lab review.'
            },
            {
                patient: 'Robert Garcia',
                patientId: 'demo_provider_pt_04',
                status: 'cancelled',
                type: 'video',
                service: 'Nutrition Follow-up',
                when: todayEvening,
                notes: 'Patient requested cancellation due to travel.'
            },
            {
                patient: 'Alina Brooks',
                patientId: 'demo_provider_pt_05',
                status: 'completed',
                type: 'video',
                service: 'Lab Results Review',
                when: yesterday,
                notes: 'Completed visit. Continuing treatment plan for 8 weeks.',
                meetingUrl: 'https://meet.google.com/ptv-alina-labs'
            },
            {
                patient: 'Emily Chen',
                patientId: 'demo_provider_pt_01',
                status: 'confirmed',
                type: 'in-person',
                service: 'Cardiometabolic Check',
                when: tomorrow,
                notes: 'In-office check for blood pressure and weight trend.'
            },
            {
                patient: 'Marcus Hill',
                patientId: 'demo_provider_pt_02',
                status: 'waitlist',
                type: 'video',
                service: 'Urgent Follow-up',
                when: inThreeDays,
                notes: 'Auto-added to waitlist due to schedule conflict.'
            }
        ];

        for (const appointment of demoAppointments) {
            const { date, time } = toDateAndTimeParts(appointment.when);
            await db.collection('appointments').add({
                providerId: user.uid,
                providerName,
                patientId: appointment.patientId,
                patientName: appointment.patient,
                patient: appointment.patient,
                date,
                time,
                startTime: appointment.when,
                status: appointment.status,
                type: appointment.type,
                service: appointment.service,
                notes: appointment.notes,
                meetingUrl: appointment.meetingUrl ?? null,
                source: 'dashboard_demo_seed',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        const demoThreads = [
            {
                patientName: 'Emily Chen',
                patientId: 'demo_provider_pt_01',
                subject: 'Blood pressure logs uploaded',
                lastMessage: 'I uploaded this week’s readings. Could you review before my visit?',
                unreadCount: 1,
                offsetMinutes: 12
            },
            {
                patientName: 'Nina Patel',
                patientId: 'demo_provider_pt_03',
                subject: 'Insurance question',
                lastMessage: 'Do I need a referral for tomorrow’s consultation?',
                unreadCount: 2,
                offsetMinutes: 45
            },
            {
                patientName: 'Alina Brooks',
                patientId: 'demo_provider_pt_05',
                subject: 'Post-visit summary',
                lastMessage: 'Thank you for today. I started the updated plan tonight.',
                unreadCount: 0,
                offsetMinutes: 180
            }
        ];

        for (const thread of demoThreads) {
            const lastMessageAt = new Date(now.getTime() - thread.offsetMinutes * 60 * 1000);
            await db.collection('threads').add({
                providerId: user.uid,
                providerName,
                patientId: thread.patientId,
                patientName: thread.patientName,
                subject: thread.subject,
                lastMessage: thread.lastMessage,
                unreadCount: thread.unreadCount,
                lastMessageAt,
                updatedAt: lastMessageAt,
                source: 'dashboard_demo_seed'
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Provider dashboard demo data seeded.',
            seeded: {
                appointments: demoAppointments.length,
                threads: demoThreads.length
            }
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected seed error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Seed provider dashboard error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
