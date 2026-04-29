import { create } from 'zustand';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { toast } from 'sonner';

interface ModulesState {
    enabledModules: string[];
    isLoaded: boolean;
    setEnabledModules: (modules: string[]) => void;
    toggleModule: (moduleId: string, enable: boolean) => Promise<void>;
}

export const usePracticeModules = create<ModulesState>((set, get) => ({
    enabledModules: [],
    isLoaded: false,
    setEnabledModules: (modules) => set({ enabledModules: modules, isLoaded: true }),
    toggleModule: async (moduleId: string, enable: boolean) => {
        try {
            const current = get().enabledModules;
            let next = [...current];
            if (enable && !next.includes(moduleId)) {
                next.push(moduleId);
            } else if (!enable && next.includes(moduleId)) {
                next = next.filter(id => id !== moduleId);
            }

            // Update local state immediately for snappy UI
            set({ enabledModules: next });

            // Persist to firestore
            const ref = doc(db, 'practice-settings', 'modules');
            await setDoc(ref, { enabledModules: next }, { merge: true });
            
            toast.success(`Module ${enable ? 'enabled' : 'disabled'} successfully.`);
        } catch (error) {
            console.error('Failed to toggle module', error);
            toast.error('Failed to update module state.');
            // Revert on error could be implemented here
        }
    }
}));

// Initialize the listener somewhere near the root or inside the layout
export function initializeModulesListener() {
    let unsubDoc = () => {};

    const unsubAuth = auth.onAuthStateChanged((user) => {
        unsubDoc();

        if (!user) {
            usePracticeModules.getState().setEnabledModules([]);
            return;
        }

        unsubDoc = onSnapshot(
            doc(db, 'practice-settings', 'modules'),
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    usePracticeModules.getState().setEnabledModules(data.enabledModules || []);
                } else {
                    usePracticeModules.getState().setEnabledModules([]);
                }
            },
            (error) => {
                console.error('Practice modules listener failed:', error);
                usePracticeModules.getState().setEnabledModules([]);
            }
        );
    });

    return () => {
        unsubDoc();
        unsubAuth();
    };
}
