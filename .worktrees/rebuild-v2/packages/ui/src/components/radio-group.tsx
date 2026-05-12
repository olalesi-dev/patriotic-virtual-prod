'use client';

import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export const RadioGroupRoot = BaseRadioGroup;

export interface RadioGroupItemProps extends ComponentProps<
  typeof BaseRadio.Root
> {
  label?: ReactNode;
}

export function RadioGroupItem({
  className,
  label,
  ...props
}: RadioGroupItemProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <BaseRadio.Root
        className={cn(
          'flex size-4 items-center justify-center rounded-full border border-primary text-primary shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        <BaseRadio.Indicator className="size-2 rounded-full bg-current" />
      </BaseRadio.Root>
      {label}
    </label>
  );
}
