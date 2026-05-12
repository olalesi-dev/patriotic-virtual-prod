'use client';

import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type ToggleProps = ComponentProps<typeof BaseToggle>;

export function Toggle({ className, ...props }: ToggleProps) {
  return (
    <BaseToggle
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-accent data-[pressed]:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}
