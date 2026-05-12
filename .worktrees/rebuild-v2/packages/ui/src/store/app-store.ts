import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';

export type ThemeScope = 'admin' | 'provider' | 'patient';
export type ColorMode = 'light' | 'dark' | 'system';

export interface AppStoreState {
  themeScope: ThemeScope;
  colorMode: ColorMode;
}

export const appStore = new Store<AppStoreState>({
  themeScope: 'provider',
  colorMode: 'system',
});

export function setThemeScope(themeScope: ThemeScope) {
  appStore.setState((state) => ({ ...state, themeScope }));
}

export function setColorMode(colorMode: ColorMode) {
  appStore.setState((state) => ({ ...state, colorMode }));
}

export function useAppStore<TSelected>(
  selector: (state: AppStoreState) => TSelected,
) {
  return useStore(appStore, selector);
}
