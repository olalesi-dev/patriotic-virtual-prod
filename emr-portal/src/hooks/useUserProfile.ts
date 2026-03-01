import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type NormalizedRole = 'patient' | 'provider';

export interface UserProfile {
    loading: boolean;
    normalizedRole: NormalizedRole;
    displayName: string;
    email: string;
    initials: string;
    sourceCollection: 'users' | 'patients' | null;
    uid: string;
}

export const useUserProfile = (user: User | null) => {
    const [profile, setProfile] = useState<UserProfile>({
        loading: true,
        normalizedRole: 'patient',
        displayName: '',
        email: '',
        initials: '',
        sourceCollection: null,
        uid: user?.uid || '',
    });

    useEffect(() => {
        if (!user) {
            setProfile((prev) => ({ ...prev, loading: false }));
            return;
        }

        const fetchProfile = async () => {
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

                if (profileData) {
                    let displayName = '';
                    if (source === 'patients') {
                        displayName = profileData.firstName && profileData.lastName
                            ? `${profileData.firstName} ${profileData.lastName}`
                            : (profileData.firstName || profileData.name || user.displayName || 'Patient');
                    } else {
                        displayName = profileData.displayName || profileData.name || user.displayName || 'User';
                    }

                    const role = profileData.role?.toLowerCase() || '';
                    let normalizedRole: NormalizedRole = 'patient';

                    if (['provider', 'clinician', 'admin', 'staff'].includes(role)) {
                        normalizedRole = 'provider';
                    } else if (role === 'patient') {
                        normalizedRole = 'patient';
                    } else {
                        console.warn(`Unknown role "${role}" for user ${user.uid}, defaulting to patient`);
                        normalizedRole = 'patient';
                    }

                    const initials = displayName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);

                    setProfile({
                        loading: false,
                        normalizedRole,
                        displayName,
                        email: user.email || '',
                        initials: initials || user.email?.substring(0, 2).toUpperCase() || 'U',
                        sourceCollection: source,
                        uid: user.uid,
                    });
                } else {
                    // Default profile if no doc exists
                    setProfile({
                        loading: false,
                        normalizedRole: 'patient',
                        displayName: user.displayName || 'User',
                        email: user.email || '',
                        initials: user.displayName?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase() || 'U',
                        sourceCollection: null,
                        uid: user.uid,
                    });
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                setProfile((prev) => ({ ...prev, loading: false }));
            }
        };

        fetchProfile();
    }, [user]);

    return profile;
};
