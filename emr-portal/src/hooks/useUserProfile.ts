import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type NormalizedRole = 'patient' | 'provider';

export interface UserProfile {
    loading: boolean;
    normalizedRole: NormalizedRole;
    displayName: string;
    email: string;
    initials: string;
    photoURL: string;
    sourceCollection: 'users' | 'patients' | null;
    uid: string;
    authenticated: boolean;
}

/** Resolves a user-friendly display name with multiple fallbacks — never returns "Unknown" */
const resolveName = (profileData: any, authUser: User): string => {
    if (profileData) {
        if (profileData.firstName && profileData.lastName)
            return `${profileData.firstName} ${profileData.lastName}`.trim();
        if (profileData.firstName) return profileData.firstName;
        if (profileData.displayName && profileData.displayName !== 'Unknown')
            return profileData.displayName;
        if (profileData.name && profileData.name !== 'Unknown')
            return profileData.name;
    }
    if (authUser.displayName && authUser.displayName !== 'Unknown')
        return authUser.displayName;
    if (authUser.email) {
        const prefix = authUser.email.split('@')[0];
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Patient';
};

const INITIAL_STATE: UserProfile = {
    loading: true,
    normalizedRole: 'patient',
    displayName: '',
    email: '',
    initials: '',
    photoURL: '',
    sourceCollection: null,
    uid: '',
    authenticated: false,
};

export const useUserProfile = () => {
    const [profile, setProfile] = useState<UserProfile>(INITIAL_STATE);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setProfile({ ...INITIAL_STATE, loading: false });
                return;
            }

            try {
                let profileData: any = null;
                let source: 'users' | 'patients' | null = null;

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    profileData = userDoc.data();
                    source = 'users';
                } else {
                    const patientDoc = await getDoc(doc(db, 'patients', user.uid));
                    if (patientDoc.exists()) {
                        profileData = patientDoc.data();
                        source = 'patients';
                    }
                }

                const displayName = resolveName(profileData, user);

                let normalizedRole: NormalizedRole = 'patient';
                if (profileData) {
                    const role = profileData.role?.toLowerCase() || '';
                    if (['provider', 'clinician', 'admin', 'staff'].includes(role)) {
                        normalizedRole = 'provider';
                    }
                }

                const initials = displayName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2) || (user.email?.substring(0, 2).toUpperCase() ?? 'P');

                setProfile({
                    loading: false,
                    normalizedRole,
                    displayName,
                    email: user.email || '',
                    initials,
                    photoURL: profileData?.photoURL || user.photoURL || '',
                    sourceCollection: source,
                    uid: user.uid,
                    authenticated: true,
                });
            } catch (error) {
                console.error('Error fetching user profile:', error);
                const fallbackName = user.displayName && user.displayName !== 'Unknown'
                    ? user.displayName
                    : user.email?.split('@')[0] || 'Patient';
                const name = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
                setProfile({
                    loading: false,
                    normalizedRole: 'patient',
                    displayName: name,
                    email: user.email || '',
                    initials: name.substring(0, 2).toUpperCase(),
                    photoURL: user.photoURL || '',
                    sourceCollection: null,
                    uid: user.uid,
                    authenticated: true,
                });
            }
        });

        return () => unsubscribe();
    }, []);

    return profile;
};
