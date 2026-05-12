import { afterEach, describe, expect, it } from 'bun:test';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { setColorMode, setThemeScope } from '../store/app-store';
import { ThemeProvider, themeInitScript, useTheme } from './theme-provider';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
  setThemeScope('provider');
  setColorMode('system');
});

function ThemeProbe() {
  const { colorMode, setColorMode, setThemeScope, themeScope, tokenScope } =
    useTheme();

  return (
    <div>
      <span data-testid="theme-state">
        {themeScope}:{tokenScope}:{colorMode}
      </span>
      <button type="button" onClick={() => setThemeScope('admin')}>
        Admin scope
      </button>
      <button type="button" onClick={() => setThemeScope('patient')}>
        Patient scope
      </button>
      <button type="button" onClick={() => setColorMode('dark')}>
        Dark mode
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  it('maps admin and provider to provider tokens while keeping patient separate', async () => {
    render(
      <ThemeProvider defaultColorMode="light" defaultThemeScope="admin">
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('theme-state').textContent).toBe(
        'admin:provider:light',
      ),
    );
    expect(document.documentElement.dataset.theme).toBe('provider');

    fireEvent.click(screen.getByRole('button', { name: 'Patient scope' }));

    await waitFor(() =>
      expect(screen.getByTestId('theme-state').textContent).toBe(
        'patient:patient:light',
      ),
    );
    expect(document.documentElement.dataset.theme).toBe('patient');
  });

  it('persists color mode and applies the dark class on the document root', async () => {
    render(
      <ThemeProvider defaultColorMode="light" defaultThemeScope="provider">
        <ThemeProbe />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }));

    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(true),
    );
    expect(localStorage.getItem('pv-ui-color-mode')).toBe('dark');
  });

  it('ships an initialization script for first-paint theme setup', () => {
    expect(themeInitScript).toContain('document.documentElement.dataset.theme');
    expect(themeInitScript).toContain('classList.toggle');
    expect(themeInitScript).toContain('pv-ui-color-mode');
  });
});
