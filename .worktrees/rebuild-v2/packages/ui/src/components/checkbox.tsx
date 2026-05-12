'use client';

import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { IconCheck } from '@tabler/icons-react';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type CheckboxProps = ComponentProps<typeof BaseCheckbox.Root>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <BaseCheckbox.Root
      className={cn(
        'peer flex size-4 shrink-0 items-center justify-center rounded border border-primary shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[checked]:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator>
        <IconCheck className="size-3" strokeWidth={3} />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
