import { auth } from '@/lib/firebase';

export type UserRole = 'Admin' | 'Provider' | 'Staff' | 'Radiologist' | 'Patient';

export interface Permissions {
    canSignNotes: boolean;
    canViewPHI: boolean;
    canEditPHI: boolean;
    canAccessAudit: boolean;
    canManageUsers: boolean;
    canPrescribe: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
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

export function usePermissions() {
    const user = auth.currentUser;

    // In a real app, the role would be in the ID Token custom claims
    // For demo/dev, we use localStorage or a simple mock
    const role: UserRole = (typeof window !== 'undefined' ? localStorage.getItem('user_role') : 'Provider') as UserRole || 'Provider';

    return {
        role,
        permissions: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['Staff'],
        isProvider: role === 'Provider' || role === 'Admin',
        isAdmin: role === 'Admin'
    };
}
