'use client';

import { Progress as BaseProgress } from '@base-ui/react/progress';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export interface ProgressProps extends Omit<
  ComponentProps<typeof BaseProgress.Root>,
  'value'
> {
  value?: number | null;
}

export function Progress({ className, value = 0, ...props }: ProgressProps) {
  const safeValue = value ?? 0;
  return (
    <BaseProgress.Root
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className,
      )}
      value={value}
      {...props}
    >
      <BaseProgress.Indicator
        className="h-full w-full flex-1 bg-primary transition-transform"
        style={{ transform: `translateX(-${100 - safeValue}%)` }}
      />
    </BaseProgress.Root>
  );
}
