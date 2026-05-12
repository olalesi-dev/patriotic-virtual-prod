'use client';

import { IconMoon, IconSun } from '@tabler/icons-react';
import { Button } from '@workspace/ui/button';
import { useTheme } from '@workspace/ui/theme-provider';
import { IconTooltip } from '@workspace/ui/tooltip';

export const ThemeToggle = () => {
  const { colorMode, setColorMode } = useTheme();
  const resolved = colorMode === 'dark' ? 'dark' : 'light';
  const nextTheme = resolved === 'dark' ? 'light' : 'dark';
  const Icon = resolved === 'dark' ? IconSun : IconMoon;

  return (
    <IconTooltip label={`Switch to ${nextTheme} mode`}>
      <Button
        aria-label={`Switch to ${nextTheme} mode`}
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => setColorMode(nextTheme)}
      >
        <Icon aria-hidden="true" size={18} stroke={1.8} />
      </Button>
    </IconTooltip>
  );
};
