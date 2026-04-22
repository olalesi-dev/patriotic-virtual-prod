import { useUserProfile } from './useUserProfile';

export type UserRole = 'Admin' | 'Provider' | 'Staff' | 'Radiologist' | 'Patient' | string;

export interface Permissions {
    canSignNotes: boolean;
    canViewPHI: boolean;
    canEditPHI: boolean;
    canAccessAudit: boolean;
    canManageUsers: boolean;
    canPrescribe: boolean;
}

const ROLE_PERMISSIONS: Record<string, Permissions> = {
    Admin: {
        canSignNotes: true,
        canViewPHI: true,
        canEditPHI: true,
        canAccessAudit: true,
        canManageUsers: true,
        canPrescribe: true,
    },
    Provider: {
        canSignNotes: true,
        canViewPHI: true,
        canEditPHI: true,
        canAccessAudit: false,
        canManageUsers: false,
        canPrescribe: true,
    },
    Staff: {
        canSignNotes: false,
        canViewPHI: true,
        canEditPHI: true,
        canAccessAudit: false,
        canManageUsers: false,
        canPrescribe: false,
    },
    Radiologist: {
        canSignNotes: false,
        canViewPHI: true,
        canEditPHI: false,
        canAccessAudit: false,
        canManageUsers: false,
        canPrescribe: false,
    },
    Patient: {
        canSignNotes: false,
        canViewPHI: false, // Can only view their own, handled by Firestore rules
        canEditPHI: false,
        canAccessAudit: false,
        canManageUsers: false,
        canPrescribe: false,
    },
};

const DEFAULT_PERMISSIONS: Permissions = ROLE_PERMISSIONS['Patient'];

export function usePermissions() {
    const profile = useUserProfile();

    // In cases where profile is loading or unauthenticated, we fallback to Patient
    const roles = profile.effectiveRoles && profile.effectiveRoles.length > 0 ? profile.effectiveRoles : ['Patient'];

    const unionPermissions: Permissions = { ...DEFAULT_PERMISSIONS };

    roles.forEach(roleName => {
        // Find a matching role ignoring case
        const matchedKey = Object.keys(ROLE_PERMISSIONS).find(k => k.toLowerCase() === roleName.toLowerCase());
        const perms = matchedKey ? ROLE_PERMISSIONS[matchedKey] : null;
        if (perms) {
            unionPermissions.canSignNotes = unionPermissions.canSignNotes || perms.canSignNotes;
            unionPermissions.canViewPHI = unionPermissions.canViewPHI || perms.canViewPHI;
            unionPermissions.canEditPHI = unionPermissions.canEditPHI || perms.canEditPHI;
            unionPermissions.canAccessAudit = unionPermissions.canAccessAudit || perms.canAccessAudit;
            unionPermissions.canManageUsers = unionPermissions.canManageUsers || perms.canManageUsers;
            unionPermissions.canPrescribe = unionPermissions.canPrescribe || perms.canPrescribe;
        }
    });

    return {
        role: roles[0] || 'Patient',
        permissions: unionPermissions,
        isProvider: roles.some(r => ['provider', 'admin', 'clinician'].includes(r.toLowerCase())),
        isAdmin: roles.some(r => r.toLowerCase() === 'admin')
    };
}
