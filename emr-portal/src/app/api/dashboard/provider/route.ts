import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { ensureProviderAccess, normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

type DashboardStatusKey =
    | 'upcoming'
    | 'checked_in'
    | 'confirmed'
    | 'pending'
    | 'completed'
    | 'cancelled'
    | 'waitlist';

interface DashboardAppointment {
    id: string;
    patient: string;
    displayTime: string;
    type: string;
    statusKey: DashboardStatusKey;
    statusLabel: string;
    startAt: string | null;
    notes: string | null;
    meetingUrl: string | null;
}

interface DashboardMessage {
    id: string;
    sender: string;
    preview: string;
    time: string;
    unread: boolean;
    unreadCount: number;
}

function asString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function readDisplayName(value: Record<string, unknown> | undefined): string | null {
    const directName = asString(value?.name) ?? asString(value?.displayName);
    if (directName) return directName;

    const firstName = asString(value?.firstName);
    const lastName = asString(value?.lastName);
    if (firstName && lastName) return `${firstName} ${lastName}`;
    return firstName ?? lastName ?? null;
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

function asDateFromDateTime(dateValue: unknown, timeValue: unknown): Date | null {
    if (typeof dateValue !== 'string' || typeof timeValue !== 'string') return null;
    const parsed = new Date(`${dateValue}T${timeValue}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimeLabel(value: Date | null): string {
    if (!value) return 'Anytime';
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(value);
}

function toStatusKey(value: unknown): DashboardStatusKey {
    const normalized = typeof value === 'string'
        ? value.trim().toLowerCase().replace(/\s+/g, '_')
        : 'pending';

    if (normalized === 'scheduled') return 'upcoming';
    if (normalized === 'checked_in') return 'checked_in';
    if (normalized === 'confirmed' || normalized === 'paid') return 'confirmed';
    if (normalized === 'pending') return 'pending';
    if (normalized === 'completed') return 'completed';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
    if (normalized === 'waitlist') return 'waitlist';
    if (normalized === 'upcoming') return 'upcoming';

    return 'pending';
}

function toStatusLabel(statusKey: DashboardStatusKey): string {
    if (statusKey === 'upcoming') return 'Upcoming';
    if (statusKey === 'checked_in') return 'Checked In';
    if (statusKey === 'confirmed') return 'Confirmed';
    if (statusKey === 'pending') return 'Pending';
    if (statusKey === 'completed') return 'Completed';
    if (statusKey === 'cancelled') return 'Cancelled';
    return 'Waitlist';
}

function toRelativeTime(dateValue: Date | null): string {
    if (!dateValue) return '—';

    const now = Date.now();
    const diffMs = now - dateValue.getTime();
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    if (diffMs < minuteMs) return 'just now';
    if (diffMs < hourMs) return `${Math.floor(diffMs / minuteMs)}m ago`;
    if (diffMs < dayMs) return `${Math.floor(diffMs / hourMs)}h ago`;
    if (diffMs < 7 * dayMs) return `${Math.floor(diffMs / dayMs)}d ago`;

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateValue);
}

function buildWeeklyVolume(appointments: DashboardAppointment[]) {
    const labels: string[] = [];
    const valuesByDate = new Map<string, number>();
    const now = new Date();

    for (let offset = 6; offset >= 0; offset -= 1) {
        const day = new Date(now);
        day.setHours(0, 0, 0, 0);
        day.setDate(now.getDate() - offset);

        const key = day.toISOString().slice(0, 10);
        labels.push(key);
        valuesByDate.set(key, 0);
    }

    for (const appointment of appointments) {
        if (!appointment.startAt) continue;
        const dayKey = appointment.startAt.slice(0, 10);
        if (!valuesByDate.has(dayKey)) continue;
        valuesByDate.set(dayKey, (valuesByDate.get(dayKey) ?? 0) + 1);
    }

    return labels.map((dayKey) => {
        const day = new Date(`${dayKey}T00:00:00`);
        const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day).slice(0, 1);
        return {
            name: weekday,
            visits: valuesByDate.get(dayKey) ?? 0
        };
    });
}

export async function GET(request: Request) {
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
    const firestore = db;

    try {
        const [userDocSnap, patientDocSnap, appointmentSnap, threadsSnap] = await Promise.all([
            firestore.collection('users').doc(user.uid).get(),
            firestore.collection('patients').doc(user.uid).get(),
            firestore.collection('appointments').where('providerId', '==', user.uid).get(),
            firestore.collection('threads').where('providerId', '==', user.uid).get()
        ]);

        const userData = userDocSnap.exists ? userDocSnap.data() : undefined;
        const patientData = patientDocSnap.exists ? patientDocSnap.data() : undefined;
        const effectiveRole = normalizeRole(
            user.token.role ??
            userData?.role ??
            patientData?.role ??
            user.role
        );

        const providerAccessError = ensureProviderAccess(user, effectiveRole);
        if (providerAccessError) return providerAccessError;

        const providerName = (
            readDisplayName(userData) ??
            readDisplayName(patientData) ??
            asString(user.token.name) ??
            user.email?.split('@')[0] ??
            'Provider'
        ) as string;

        const appointmentRows = appointmentSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            data: docSnap.data()
        }));

        const threadRows = threadsSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            data: docSnap.data()
        }));

        const patientIdsForLookup = Array.from(new Set([
            ...appointmentRows
                .map(({ data }) => asString(data.patientId) ?? asString(data.patientUid))
                .filter((value): value is string => Boolean(value)),
            ...threadRows
                .map(({ data }) => asString(data.patientId) ?? asString(data.patientUid))
                .filter((value): value is string => Boolean(value))
        ]));

        const patientNamesById = new Map<string, string>();
        if (patientIdsForLookup.length > 0) {
            const [patientDocs, userDocs] = await Promise.all([
                firestore.getAll(...patientIdsForLookup.map((patientId) => firestore.collection('patients').doc(patientId))),
                firestore.getAll(...patientIdsForLookup.map((patientId) => firestore.collection('users').doc(patientId)))
            ]);

            for (let index = 0; index < patientIdsForLookup.length; index += 1) {
                const patientId = patientIdsForLookup[index];
                const patientDocName = patientDocs[index].exists
                    ? readDisplayName(patientDocs[index].data() as Record<string, unknown>)
                    : null;
                const userDocName = userDocs[index].exists
                    ? readDisplayName(userDocs[index].data() as Record<string, unknown>)
                    : null;
                const resolvedName = patientDocName ?? userDocName;

                if (resolvedName) {
                    patientNamesById.set(patientId, resolvedName);
                }
            }
        }

        const appointments: DashboardAppointment[] = appointmentRows.map(({ id, data }) => {
            const startAtDate =
                asDate(data.startTime) ??
                asDateFromDateTime(data.date, data.time) ??
                asDate(data.date);
            const patientId = asString(data.patientId) ?? asString(data.patientUid);
            const fallbackPatientName = patientId ? patientNamesById.get(patientId) : null;

            const statusKey = toStatusKey(data.status);
            const typeLabel = typeof data.service === 'string' && data.service.trim() !== ''
                ? data.service
                : (typeof data.type === 'string' && data.type.trim() !== '' ? data.type : 'Consultation');

            const meetingUrl =
                (typeof data.meetingUrl === 'string' && data.meetingUrl.trim() !== '' ? data.meetingUrl : null) ??
                (typeof data.videoLink === 'string' && data.videoLink.trim() !== '' ? data.videoLink : null) ??
                (typeof data.telehealthUrl === 'string' && data.telehealthUrl.trim() !== '' ? data.telehealthUrl : null);

            return {
                id,
                patient: (asString(data.patientName) ?? asString(data.patient) ?? fallbackPatientName ?? 'Unknown Patient') as string,
                displayTime: formatTimeLabel(startAtDate),
                type: typeLabel,
                statusKey,
                statusLabel: toStatusLabel(statusKey),
                startAt: startAtDate ? startAtDate.toISOString() : null,
                notes: typeof data.notes === 'string' ? data.notes : (typeof data.reason === 'string' ? data.reason : null),
                meetingUrl
            };
        }).sort((a, b) => {
            if (!a.startAt && !b.startAt) return 0;
            if (!a.startAt) return 1;
            if (!b.startAt) return -1;
            return a.startAt.localeCompare(b.startAt);
        });

        const messagesWithSortWeight = threadRows.map(({ id, data }) => {
            const providerUnreadRaw = typeof data.providerUnreadCount === 'number'
                ? data.providerUnreadCount
                : (typeof data.unreadCount === 'number' ? data.unreadCount : 0);
            const providerUnreadCount = providerUnreadRaw > 0
                ? providerUnreadRaw
                : (data.unread === true ? 1 : 0);
            const lastMessageDate = asDate(data.lastMessageAt) ?? asDate(data.updatedAt) ?? asDate(data.createdAt);
            const patientId = asString(data.patientId) ?? asString(data.patientUid);
            const fallbackPatientName = patientId ? patientNamesById.get(patientId) : null;
            const lastMessageAtMs = lastMessageDate?.getTime() ?? 0;

            return {
                id,
                sender: (asString(data.patientName) ?? asString(data.subject) ?? fallbackPatientName ?? 'Patient') as string,
                preview: (asString(data.lastMessage) ?? asString(data.subject) ?? 'New message') as string,
                time: toRelativeTime(lastMessageDate),
                unread: providerUnreadCount > 0,
                unreadCount: providerUnreadCount,
                lastMessageAtMs
            };
        })
            .sort((a, b) => {
                const aWeight = a.unread ? 1 : 0;
                const bWeight = b.unread ? 1 : 0;
                if (aWeight !== bWeight) return bWeight - aWeight;
                return b.lastMessageAtMs - a.lastMessageAtMs;
            });

        const unreadMessageCount = messagesWithSortWeight.reduce((total, message) => (
            total + message.unreadCount
        ), 0);

        const messages: DashboardMessage[] = messagesWithSortWeight
            .slice(0, 8)
            .map(({ id, sender, preview, time, unread, unreadCount }) => ({
                id,
                sender,
                preview,
                time,
                unread,
                unreadCount
            }));

        const weeklyVolume = buildWeeklyVolume(appointments);

        return NextResponse.json({
            success: true,
            providerName,
            appointments,
            messages,
            unreadMessageCount,
            weeklyVolume,
            generatedAt: new Date().toISOString()
        });
    } catch (error: unknown) {
        const rawMessage = error instanceof Error ? error.message : 'Unexpected server error.';
        const message = rawMessage.includes('Could not load the default credentials')
            ? `Firebase Admin credentials are missing. ${FIREBASE_ADMIN_SETUP_HINT}`
            : rawMessage;
        console.error('Dashboard provider API error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
