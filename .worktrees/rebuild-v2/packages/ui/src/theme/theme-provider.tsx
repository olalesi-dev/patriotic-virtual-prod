'use client';

import { type ReactNode, useEffect } from 'react';
import {
  appStore,
  setColorMode,
  setThemeScope,
  useAppStore,
  type ColorMode,
  type ThemeScope,
} from '../store/app-store';

const themeTokenScope: Record<ThemeScope, 'provider' | 'patient'> = {
  admin: 'provider',
  provider: 'provider',
  patient: 'patient',
};

const storageKey = 'pv-ui-theme';
const colorModeStorageKey = 'pv-ui-color-mode';

function getSystemMode() {
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export const themeInitScript = `
(() => {
  const themeScopeMap = { admin: 'provider', provider: 'provider', patient: 'patient' };
  const savedTheme = localStorage.getItem('${storageKey}') || 'provider';
  const savedMode = localStorage.getItem('${colorModeStorageKey}') || 'system';
  const resolvedMode = savedMode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : savedMode;
  document.documentElement.dataset.theme = themeScopeMap[savedTheme] || 'provider';
  document.documentElement.classList.toggle('dark', resolvedMode === 'dark');
})();
`;

export interface ThemeProviderProps {
  children: ReactNode;
  defaultThemeScope?: ThemeScope;
  defaultColorMode?: ColorMode;
}

export function ThemeProvider({
  children,
  defaultColorMode = 'system',
  defaultThemeScope = 'provider',
}: ThemeProviderProps) {
  const themeScope = useAppStore((state) => state.themeScope);
  const colorMode = useAppStore((state) => state.colorMode);

  useEffect(() => {
    const savedTheme = globalThis.localStorage.getItem(
      storageKey,
    ) as ThemeScope | null;
    const savedMode = globalThis.localStorage.getItem(
      colorModeStorageKey,
    ) as ColorMode | null;
    setThemeScope(savedTheme ?? defaultThemeScope);
    setColorMode(savedMode ?? defaultColorMode);
  }, [defaultColorMode, defaultThemeScope]);

  useEffect(() => {
    const resolvedMode = colorMode === 'system' ? getSystemMode() : colorMode;
    document.documentElement.dataset.theme = themeTokenScope[themeScope];
    document.documentElement.classList.toggle('dark', resolvedMode === 'dark');
    globalThis.localStorage.setItem(storageKey, themeScope);
    globalThis.localStorage.setItem(colorModeStorageKey, colorMode);
  }, [colorMode, themeScope]);

  return children;
}

export function useTheme() {
  const themeScope = useAppStore((state) => state.themeScope);
  const colorMode = useAppStore((state) => state.colorMode);

  return {
    colorMode,
    setColorMode,
    setThemeScope,
    themeScope,
    tokenScope: themeTokenScope[themeScope],
  };
}

export function getCurrentThemeState() {
  return appStore.state;
}
