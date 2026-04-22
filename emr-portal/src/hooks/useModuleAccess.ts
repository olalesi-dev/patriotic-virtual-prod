import { create } from 'zustand';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { useUserProfile } from './useUserProfile';

export interface ModuleRbacMatrix {
    [moduleName: string]: {
        [roleName: string]: boolean;
    };
}

interface ModuleAccessState {
    matrix: ModuleRbacMatrix;
    isLoaded: boolean;
    setMatrix: (matrix: ModuleRbacMatrix) => void;
    toggleAccess: (moduleName: string, roleName: string, enable: boolean) => Promise<void>;
}

export const useModuleAccessStore = create<ModuleAccessState>((set, get) => ({
    matrix: {},
    isLoaded: false,
    setMatrix: (matrix) => set({ matrix, isLoaded: true }),
    toggleAccess: async (moduleName: string, roleName: string, enable: boolean) => {
        try {
            const currentMatrix = get().matrix;
            const nextMatrix = { ...currentMatrix };
            if (!nextMatrix[moduleName]) {
                nextMatrix[moduleName] = {};
            }
            nextMatrix[moduleName][roleName] = enable;

            // Optimistic update
            set({ matrix: nextMatrix });

            // Persist
            const ref = doc(db, 'practice-settings', 'modules-rbac');
            await setDoc(ref, { matrix: nextMatrix }, { merge: true });
            
            toast.success(`Access for ${roleName} to ${moduleName} ${enable ? 'enabled' : 'disabled'}.`);
        } catch (error) {
            console.error('Failed to toggle module access', error);
            toast.error('Failed to update access matrix.');
        }
    }
}));

export function initializeModuleAccessListener() {
    let unsubDoc = () => {};

    const unsubAuth = auth.onAuthStateChanged((user) => {
        unsubDoc();

        if (!user) {
            useModuleAccessStore.getState().setMatrix({});
            return;
        }

        unsubDoc = onSnapshot(
            doc(db, 'practice-settings', 'modules-rbac'),
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    useModuleAccessStore.getState().setMatrix(data.matrix || {});
                } else {
                    useModuleAccessStore.getState().setMatrix({});
                }
            },
            (error) => {
                console.error('Module RBAC listener failed:', error);
                useModuleAccessStore.getState().setMatrix({});
            }
        );
    });

    return () => {
        unsubDoc();
        unsubAuth();
    };
}

export function useModuleAccess(moduleName: string) {
    const { matrix, isLoaded } = useModuleAccessStore();
    const profile = useUserProfile();

    // Default open while loading to prevent flash of hidden content
    if (!isLoaded || profile.loading) return true;

    const moduleConfig = matrix[moduleName];
    // Default open if no configuration exists for this module at all
    if (!moduleConfig) return true;

    const roles = profile.effectiveRoles && profile.effectiveRoles.length > 0 ? profile.effectiveRoles : ['Patient'];

    // Check if any of the user's roles have access to this module
    return roles.some(role => moduleConfig[role] === true);
}
