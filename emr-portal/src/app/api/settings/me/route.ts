import { NextResponse } from 'next/server';
import { auth as adminAuth, db, FIREBASE_ADMIN_SETUP_HINT } from '@/lib/firebase-admin';
import { normalizeRole, requireAuthenticatedUser } from '@/lib/server-auth';
import {
    buildDefaultSettings,
    normalizeSettings,
    type PatientSettings,
    type ProviderSettings,
    SETTINGS_VERSION,
    type SettingsRole,
    settingsPatchSchema,
    type UserSettings
} from '@/lib/settings';

export const dynamic = 'force-dynamic';

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function toRole(role: string | null): SettingsRole {
    return role === 'patient' ? 'patient' : 'provider';
}

interface SettingsContext {
    role: SettingsRole;
    settings: UserSettings;
    userDocData: Record<string, unknown> | null;
    patientDocData: Record<string, unknown> | null;
    hasPersistedSettings: boolean;
    settingsNeedsRepair: boolean;
}

async function resolveSettingsContext(uid: string, roleHint: string | null, email: string | null): Promise<SettingsContext> {
    if (!db) {
        throw new Error(`Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}`);
    }

    const [userDoc, patientDoc, settingsDoc] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('patients').doc(uid).get(),
        db.collection('user_settings').doc(uid).get()
    ]);

    const userDocData = userDoc.exists ? (userDoc.data() as Record<string, unknown>) : null;
    const patientDocData = patientDoc.exists ? (patientDoc.data() as Record<string, unknown>) : null;
    const effectiveRole = toRole(
        normalizeRole(
            roleHint ??
            userDocData?.role ??
            patientDocData?.role ??
            null
        )
    );

    const displayName = asNonEmptyString(userDocData?.name)
        ?? asNonEmptyString(userDocData?.displayName)
        ?? asNonEmptyString(patientDocData?.name)
        ?? asNonEmptyString(patientDocData?.displayName)
        ?? (email ? email.split('@')[0] : 'Care User');

    const specialty = asNonEmptyString(userDocData?.specialty)
        ?? asNonEmptyString(patientDocData?.specialty)
        ?? null;

    const phone = asNonEmptyString(userDocData?.phone)
        ?? asNonEmptyString(userDocData?.phoneNumber)
        ?? asNonEmptyString(patientDocData?.phone)
        ?? asNonEmptyString(patientDocData?.phoneNumber)
        ?? null;

    const timezoneHint = asNonEmptyString(settingsDoc.data()?.locale?.timezone)
        ?? asNonEmptyString(userDocData?.timezone)
        ?? asNonEmptyString(patientDocData?.timezone)
        ?? null;

    const defaults = buildDefaultSettings({
        role: effectiveRole,
        email,
        displayName,
        phone,
        specialty,
        timezone: timezoneHint
    });

    if (!settingsDoc.exists) {
        return {
            role: effectiveRole,
            settings: defaults,
            userDocData,
            patientDocData,
            hasPersistedSettings: false,
            settingsNeedsRepair: true
        };
    }

    try {
        const normalized = normalizeSettings(settingsDoc.data(), defaults);
        const roleMismatched = normalized.role !== effectiveRole;
        const versionMismatched = settingsDoc.data()?.version !== SETTINGS_VERSION;

        return {
            role: effectiveRole,
            settings: roleMismatched
                ? normalizeSettings({ ...normalized, role: effectiveRole }, defaults)
                : normalized,
            userDocData,
            patientDocData,
            hasPersistedSettings: true,
            settingsNeedsRepair: roleMismatched || versionMismatched
        };
    } catch {
        return {
            role: effectiveRole,
            settings: defaults,
            userDocData,
            patientDocData,
            hasPersistedSettings: true,
            settingsNeedsRepair: true
        };
    }
}

async function persistSettings(uid: string, settings: UserSettings) {
    if (!db) {
        throw new Error(`Firebase Admin database is not initialized on server. ${FIREBASE_ADMIN_SETUP_HINT}`);
    }

    await db.collection('user_settings').doc(uid).set({
        ...settings,
        version: SETTINGS_VERSION,
        updatedAt: new Date()
    }, { merge: true });
}

export async function GET(request: Request) {
    const { user, errorResponse } = await requireAuthenticatedUser(request, { resolveRole: false });
    if (errorResponse) return errorResponse;
    if (!user) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    try {
        const context = await resolveSettingsContext(user.uid, user.token.role ? String(user.token.role) : user.role, user.email);
        if (context.settingsNeedsRepair || !context.hasPersistedSettings) {
            await persistSettings(user.uid, context.settings);
        }

        return NextResponse.json({
            success: true,
            settings: context.settings
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load user settings.';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
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
        const parsedPayload = settingsPatchSchema.safeParse(await request.json());
        if (!parsedPayload.success) {
            return NextResponse.json({ success: false, error: 'Invalid settings payload.' }, { status: 400 });
        }

        const context = await resolveSettingsContext(user.uid, user.token.role ? String(user.token.role) : user.role, user.email);
        const patch = parsedPayload.data;
        const role = context.role;

        if (role === 'patient' && (patch.section === 'services' || patch.section === 'availability')) {
            return NextResponse.json({ success: false, error: 'Patients cannot update provider availability settings.' }, { status: 403 });
        }

        let nextSettings: UserSettings = context.settings;
        if (patch.section === 'profile') {
            nextSettings = {
                ...nextSettings,
                profile: patch.value
            };
        } else if (patch.section === 'locale') {
            if (role === 'provider') {
                const providerSettings = nextSettings as ProviderSettings;
                nextSettings = {
                    ...providerSettings,
                    locale: patch.value,
                    availability: {
                        ...providerSettings.availability,
                        timezone: patch.value.timezone
                    }
                };
            } else {
                const patientSettings = nextSettings as PatientSettings;
                nextSettings = {
                    ...patientSettings,
                    locale: patch.value
                };
            }
        } else if (patch.section === 'theme') {
            nextSettings = {
                ...nextSettings,
                theme: patch.value
            };
        } else if (patch.section === 'notifications') {
            nextSettings = {
                ...nextSettings,
                notifications: patch.value
            };
        } else if (patch.section === 'connectedApps') {
            nextSettings = {
                ...nextSettings,
                connectedApps: patch.value
            };
        } else if (patch.section === 'services' && role === 'provider') {
            const providerSettings = nextSettings as ProviderSettings;
            nextSettings = {
                ...providerSettings,
                services: patch.value
            };
        } else if (patch.section === 'availability' && role === 'provider') {
            const providerSettings = nextSettings as ProviderSettings;
            nextSettings = {
                ...providerSettings,
                availability: patch.value
            };
        }

        const normalizedNextSettings = normalizeSettings(nextSettings, context.settings);
        const now = new Date();
        const batch = db.batch();
        const settingsRef = db.collection('user_settings').doc(user.uid);
        batch.set(settingsRef, {
            ...normalizedNextSettings,
            version: SETTINGS_VERSION,
            updatedAt: now
        }, { merge: true });

        if (patch.section === 'profile') {
            const profile = patch.value;
            const fullName = `${profile.firstName} ${profile.lastName}`.trim();

            const userDocRef = db.collection('users').doc(user.uid);
            batch.set(userDocRef, {
                firstName: profile.firstName,
                lastName: profile.lastName,
                name: fullName,
                displayName: fullName,
                phone: profile.phone,
                phoneNumber: profile.phone,
                title: profile.title,
                specialty: profile.specialty,
                updatedAt: now
            }, { merge: true });

            const patientDocRef = db.collection('patients').doc(user.uid);
            const shouldUpdatePatientDoc = context.patientDocData !== null || role === 'patient';
            if (shouldUpdatePatientDoc) {
                batch.set(patientDocRef, {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    name: fullName,
                    displayName: fullName,
                    phone: profile.phone,
                    phoneNumber: profile.phone,
                    updatedAt: now
                }, { merge: true });
            }

            if (adminAuth) {
                try {
                    await adminAuth.updateUser(user.uid, { displayName: fullName });
                } catch (updateError) {
                    console.warn('Unable to update Firebase Auth displayName for settings profile update.', updateError);
                }
            }
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            settings: normalizedNextSettings
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update user settings.';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
