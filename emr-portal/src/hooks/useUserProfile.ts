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
    sourceCollection: 'users' | 'patients' | null;
    uid: string;
    authenticated: boolean;
}

export const useUserProfile = () => {
    const [profile, setProfile] = useState<UserProfile>({
        loading: true,
        normalizedRole: 'patient',
        displayName: '',
        email: '',
        initials: '',
        sourceCollection: null,
        uid: '',
        authenticated: false,
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setProfile({
                    loading: false,
                    normalizedRole: 'patient',
                    displayName: '',
                    email: '',
                    initials: '',
                    sourceCollection: null,
                    uid: '',
                    authenticated: false,
                });
                return;
            }

            try {
                let profileData: any = null;
                let source: 'users' | 'patients' | null = null;

                // Try users collection first (common for staff/providers)
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    profileData = userDoc.data();
                    source = 'users';
                } else {
                    // Try patients collection
                    const patientDoc = await getDoc(doc(db, 'patients', user.uid));
                    if (patientDoc.exists()) {
                        profileData = patientDoc.data();
                        source = 'patients';
                    }
                }

                let displayName = '';
                let normalizedRole: NormalizedRole = 'patient';
                let initials = '';

                if (profileData) {
                    if (source === 'patients') {
                        displayName = profileData.firstName && profileData.lastName
                            ? `${profileData.firstName} ${profileData.lastName}`
                            : (profileData.firstName || profileData.name || user.displayName || 'Patient');
                    } else {
                        displayName = profileData.displayName || profileData.name || user.displayName || 'User';
                    }

                    const role = profileData.role?.toLowerCase() || '';

                    if (['provider', 'clinician', 'admin', 'staff'].includes(role)) {
                        normalizedRole = 'provider';
                    } else if (role === 'patient') {
                        normalizedRole = 'patient';
                    } else {
                        console.warn(`Unknown role "${role}" for user ${user.uid}, defaulting to patient`);
                        normalizedRole = 'patient';
                    }
                } else {
                    displayName = user.displayName || 'User';
                    normalizedRole = 'patient';
                }

                initials = displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);

                if (!initials && user.email) {
                    initials = user.email.substring(0, 2).toUpperCase();
                }

                setProfile({
                    loading: false,
                    normalizedRole,
                    displayName,
                    email: user.email || '',
                    initials: initials || 'U',
                    sourceCollection: source,
                    uid: user.uid,
                    authenticated: true,
                });
            } catch (error) {
                console.error('Error fetching user profile:', error);
                setProfile((prev) => ({ ...prev, loading: false, authenticated: true }));
            }
        });

        return () => unsubscribe();
    }, []);

    return profile;
};
