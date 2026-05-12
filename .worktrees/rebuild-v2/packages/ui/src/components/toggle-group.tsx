'use client';

import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type ToggleGroupProps = ComponentProps<typeof BaseToggleGroup>;

export function ToggleGroup({ className, ...props }: ToggleGroupProps) {
  return (
    <BaseToggleGroup
      className={cn(
        'inline-flex items-center rounded-md border bg-background shadow-sm',
        className,
      )}
      {...props}
    />
  );
}
