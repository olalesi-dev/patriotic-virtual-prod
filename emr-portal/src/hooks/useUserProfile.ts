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
    referralCode?: string;
    roles: string[];
    personaGroupId: string | null;
    effectiveRoles: string[];
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
    roles: [],
    personaGroupId: null,
    effectiveRoles: [],
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
                
                let personaGroupRoles: string[] = [];
                let personaGroupId = profileData?.personaGroupId || null;
                
                if (personaGroupId) {
                    try {
                        const pgDoc = await getDoc(doc(db, 'personaGroups', personaGroupId));
                        if (pgDoc.exists()) {
                            personaGroupRoles = pgDoc.data().roles || [];
                        }
                    } catch (e) {}
                }

                let directRoles: string[] = Array.isArray(profileData?.roles) ? profileData.roles : [];
                // Backward compatibility: If no roles array but single role exists, convert
                if (directRoles.length === 0 && profileData?.role) {
                    directRoles = [profileData.role];
                }

                const effectiveRoles = Array.from(new Set([...directRoles, ...personaGroupRoles]));

                if (effectiveRoles.some(r => ['provider', 'clinician', 'admin', 'staff'].includes(r.toLowerCase()))) {
                    normalizedRole = 'provider';
                }

                const initials = displayName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2) || (user.email?.substring(0, 2).toUpperCase() ?? 'P');

                // Self-heal: if Firestore doc is missing or has bad name, write the correct one back
                const storedBadName = !profileData?.displayName
                    || profileData?.displayName === 'Unknown'
                    || profileData?.firstName === undefined;

                if (storedBadName && source === null || (source && storedBadName)) {
                    try {
                        const { setDoc: sd, doc: d, serverTimestamp: st } = await import('firebase/firestore');
                        const nameParts = displayName.split(' ');
                        await sd(d(db, 'users', user.uid), {
                            displayName,
                            firstName: nameParts[0] || '',
                            lastName: nameParts.slice(1).join(' ') || '',
                            email: user.email || '',
                            role: profileData?.role || 'patient',
                            roles: directRoles.length ? directRoles : ['Patient'],
                            updatedAt: st(),
                        }, { merge: true });
                    } catch (healErr) { /* silent — best-effort */ }
                }

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
                    referralCode: profileData?.referralCode,
                    roles: directRoles,
                    personaGroupId,
                    effectiveRoles,
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
                    roles: [],
                    personaGroupId: null,
                    effectiveRoles: [],
                });
            }
        });

        return () => unsubscribe();
    }, []);

    return profile;
};
