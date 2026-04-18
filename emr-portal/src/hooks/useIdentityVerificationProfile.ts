import { useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { IdentityVerificationStatus } from '@/lib/identity-verification';

export interface IdentityVerificationProfile {
    loading: boolean;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthDate: string;
    verified: boolean;
    status: IdentityVerificationStatus;
}

const INITIAL_PROFILE: IdentityVerificationProfile = {
    loading: true,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    verified: false,
    status: 'not_started',
};

function splitDisplayName(displayName: string | null | undefined): { firstName: string; lastName: string } {
    const normalized = (displayName ?? '').trim();
    if (!normalized) {
        return { firstName: '', lastName: '' };
    }

    const [firstName, ...rest] = normalized.split(/\s+/);
    return {
        firstName: firstName ?? '',
        lastName: rest.join(' '),
    };
}

function buildProfileFromSource(user: FirebaseUser, source: Record<string, unknown> | null): IdentityVerificationProfile {
    const safeSource = source ?? {};
    const fallbackName = splitDisplayName(user.displayName || user.email?.split('@')[0] || '');
    const storedName = splitDisplayName(String(safeSource.displayName ?? safeSource.name ?? ''));
    const firstName = String(safeSource.firstName ?? storedName.firstName ?? fallbackName.firstName ?? '').trim();
    const lastName = String(safeSource.lastName ?? storedName.lastName ?? fallbackName.lastName ?? '').trim();
    const verification = safeSource.identityVerification && typeof safeSource.identityVerification === 'object'
        ? safeSource.identityVerification as Record<string, unknown>
        : null;
    const verified = Boolean(verification?.verified ?? safeSource.isIdentityVerified ?? false);
    const statusValue = typeof verification?.status === 'string' ? verification.status : null;
    const status: IdentityVerificationStatus = statusValue === 'pending'
        || statusValue === 'verified'
        || statusValue === 'failed'
        || statusValue === 'review_required'
        || statusValue === 'not_started'
        ? statusValue
        : verified
            ? 'verified'
            : 'not_started';

    return {
        loading: false,
        firstName,
        lastName,
        email: String(safeSource.email ?? user.email ?? '').trim(),
        phone: String(safeSource.phone ?? safeSource.phoneNumber ?? user.phoneNumber ?? '').trim(),
        birthDate: String(safeSource.dateOfBirth ?? safeSource.dob ?? '').trim(),
        verified,
        status,
    };
}

export function useIdentityVerificationProfile(user: FirebaseUser | null): IdentityVerificationProfile {
    const [profile, setProfile] = useState<IdentityVerificationProfile>({
        ...INITIAL_PROFILE,
        loading: Boolean(user),
    });

    useEffect(() => {
        if (!user) {
            setProfile({
                ...INITIAL_PROFILE,
                loading: false,
            });
            return;
        }

        let latestUserSource: Record<string, unknown> | null = null;
        let latestPatientSource: Record<string, unknown> | null = null;
        let userReady = false;
        let patientReady = false;

        const commitProfile = () => {
            if (!userReady || !patientReady) {
                return;
            }

            setProfile(buildProfileFromSource(user, latestUserSource ?? latestPatientSource));
        };

        const handleSnapshotError = (error: unknown) => {
            console.error('Failed to subscribe to identity verification profile:', error);
            userReady = true;
            patientReady = true;
            setProfile(buildProfileFromSource(user, latestUserSource ?? latestPatientSource));
        };

        const unsubscribeUser = onSnapshot(
            doc(db, 'users', user.uid),
            (snapshot) => {
                latestUserSource = snapshot.exists() ? snapshot.data() : null;
                userReady = true;
                commitProfile();
            },
            handleSnapshotError,
        );

        const unsubscribePatient = onSnapshot(
            doc(db, 'patients', user.uid),
            (snapshot) => {
                latestPatientSource = snapshot.exists() ? snapshot.data() : null;
                patientReady = true;
                commitProfile();
            },
            handleSnapshotError,
        );

        return () => {
            unsubscribeUser();
            unsubscribePatient();
        };
    }, [user]);

    return profile;
}