import { Field as BaseField } from '@base-ui/react/field';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type LabelProps = ComponentProps<typeof BaseField.Label>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <BaseField.Label
      className={cn(
        'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
}
