import { NextResponse } from 'next/server';
import { db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { requireAuthenticatedUser, ensureProviderAccess } from '@/lib/server-auth';

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function normalizeRole(value: unknown): string | null {
    return asNonEmptyString(value)?.toLowerCase() ?? null;
}

function normalizeSource(value: unknown): string {
    return asNonEmptyString(value) ?? 'manual / SOAP notes';
}

function readSoapSections(value: unknown): Record<string, string> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const sections = {
        subjective: asNonEmptyString(record.subjective) ?? '',
        objective: asNonEmptyString(record.objective) ?? '',
        assessment: asNonEmptyString(record.assessment) ?? '',
        plan: asNonEmptyString(record.plan) ?? ''
    };

    return Object.values(sections).some(Boolean) ? sections : null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const { user, errorResponse } = await requireAuthenticatedUser(request, { resolveRole: true });
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const providerAccessError = ensureProviderAccess(user);
    if (providerAccessError) return providerAccessError;

    if (!db) {
        return NextResponse.json(
            { success: false, error: `Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}` },
            { status: 500 }
        );
    }

    try {
        const patientId = params.id;
        const body = await request.json();
        const soapNote = asNonEmptyString(body?.soapNote);

        if (!soapNote) {
            return NextResponse.json({ success: false, error: 'No SOAP note provided.' }, { status: 400 });
        }

        const patientRef = db.collection('patients').doc(patientId);
        const userRef = db.collection('users').doc(patientId);
        const [patientDoc, userDoc] = await Promise.all([
            patientRef.get(),
            userRef.get()
        ]);

        const patientData = patientDoc.data() as Record<string, unknown> | undefined;
        const userData = userDoc.data() as Record<string, unknown> | undefined;
        const patientRole = normalizeRole(patientData?.role ?? userData?.role);

        if (!patientDoc.exists && (!userDoc.exists || (patientRole && patientRole !== 'patient'))) {
            return NextResponse.json({ success: false, error: 'Patient not found.' }, { status: 404 });
        }

        const now = new Date();
        const nowIso = now.toISOString();
        const source = normalizeSource(body?.source);
        const sections = readSoapSections(body?.sections);
        const transcript = asNonEmptyString(body?.transcript);
        const clinicianName = asNonEmptyString((user.token as { name?: unknown }).name) ?? asNonEmptyString(user.email) ?? 'Provider';
        const patientDisplayName = asNonEmptyString(patientData?.displayName)
            ?? asNonEmptyString(patientData?.name)
            ?? asNonEmptyString(userData?.displayName)
            ?? asNonEmptyString(userData?.name);
        const patientEmail = asNonEmptyString(patientData?.email) ?? asNonEmptyString(userData?.email);

        const batch = db.batch();

        const timelineRef = patientRef.collection('timeline').doc();
        batch.set(timelineRef, {
            type: 'encounter',
            eventType: 'note.saved',
            date: nowIso,
            timestamp: now,
            description: source === 'manual / waiting room'
                ? 'Waiting room SOAP note saved'
                : 'SOAP note saved',
            notes: `[SOAP Note]\n${soapNote}`,
            patientId,
            clinicianId: user.uid,
            providerId: user.uid,
            authorId: user.uid,
            authorEmail: user.email,
            providerName: clinicianName,
            source,
            createdAt: now,
            updatedAt: now
        });

        const encounterRef = patientRef.collection('encounters').doc();
        batch.set(encounterRef, {
            patientId,
            patientName: patientDisplayName ?? null,
            patientEmail: patientEmail ?? null,
            clinicianId: user.uid,
            providerId: user.uid,
            authorId: user.uid,
            authorEmail: user.email,
            providerName: clinicianName,
            date: nowIso,
            timestamp: now,
            title: source === 'manual / waiting room' ? 'Waiting Room SOAP Note' : 'SOAP Encounter Note',
            type: 'Telehealth',
            source,
            status: 'draft',
            soapNote,
            ...(sections ? { sections } : {}),
            ...(transcript ? { transcript } : {}),
            notes: soapNote,
            createdAt: now,
            updatedAt: now,
            signedAt: null,
            lockedAt: null
        });

        batch.set(patientRef, {
            ...(patientDisplayName ? { displayName: patientDisplayName, name: patientDisplayName } : {}),
            ...(patientEmail ? { email: patientEmail } : {}),
            role: patientRole ?? 'patient',
            lastSoapNoteAt: now,
            updatedAt: now
        }, { merge: true });

        const soapNoteRef = db.collection('soap_notes').doc(encounterRef.id);
        batch.set(soapNoteRef, {
            patientId,
            clinicianId: user.uid,
            providerId: user.uid,
            authorId: user.uid,
            authorEmail: user.email,
            patientName: patientDisplayName ?? null,
            patientEmail: patientEmail ?? null,
            source,
            status: 'draft',
            soapNote,
            ...(sections ? { sections } : {}),
            ...(transcript ? { transcript } : {}),
            encounterPath: encounterRef.path,
            timelinePath: timelineRef.path,
            timestamp: now,
            createdAt: now,
            updatedAt: now
        });

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: 'SOAP note assigned to patient successfully.',
            patientId,
            clinicianId: user.uid,
            encounterId: encounterRef.id,
            timelineId: timelineRef.id,
            createdAt: nowIso
        });
    } catch (error: any) {
        console.error('Error saving SOAP note to patient:', error);
        return NextResponse.json({ success: false, error: error.message || 'Server Error' }, { status: 500 });
    }
}
